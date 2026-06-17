import 'server-cli-only'

import { createOryMiddleware } from '@ory/nextjs/middleware'
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import oryConfig from '@/configs/ory'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getAuthRouteRedirect } from './auth-routes'
import {
  classifyProxyRequest,
  type ProxyPlan,
  planNeedsAuthSession,
} from './classifier'
import {
  handleAuthGate,
  handleMiddlewareRedirect,
  handleMiddlewareRewrite,
  handleRouteRewritePassthrough,
} from './handlers'

type RunProxyOptions = {
  isAuthenticated?: boolean
}

// Same-origin paths the @ory/nextjs proxy forwards to Kratos (NEXT_PUBLIC_ORY_SDK_URL),
// so the custom UI's flow cookies stay first-party.
const ORY_SDK_PROXY_PREFIXES = [
  '/self-service',
  '/sessions/whoami',
  '/ui',
  '/.well-known/ory',
  '/.ory',
]

// Pass oryConfig.project so the middleware rewrites Kratos redirects onto our UI URLs.
const oryProxy = createOryMiddleware({ project: oryConfig.project })

function isOrySdkProxyPath(pathname: string): boolean {
  return ORY_SDK_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// Edge-safe session check for the middleware gate (getServerSession can't run in
// middleware). Redirect gating only; real enforcement is server-side.
async function isOrySessionActiveInProxy(
  request: NextRequest
): Promise<boolean> {
  const sdkUrl = process.env.NEXT_PUBLIC_ORY_SDK_URL ?? process.env.ORY_SDK_URL
  const cookie = request.headers.get('cookie')
  if (!sdkUrl || !cookie) return false

  try {
    const res = await fetch(`${sdkUrl.replace(/\/$/, '')}/sessions/whoami`, {
      headers: { cookie, accept: 'application/json' },
    })
    if (!res.ok) return false
    const session = (await res.json()) as { active?: boolean }
    return session.active === true
  } catch {
    return false
  }
}

export async function runDashboardProxy(
  request: NextRequest,
  _event: NextFetchEvent
) {
  // Forward Ory SDK traffic to Kratos before classification (it would otherwise
  // classify as a bypass and go to Next). This keeps the same-origin Kratos
  // self-service flow + whoami cookies first-party.
  if (isOrySdkProxyPath(request.nextUrl.pathname)) {
    return oryProxy(request)
  }

  const plan = classifyProxyRequest(request.nextUrl.pathname)

  if (!planNeedsAuthSession(plan)) {
    return runProxyConcerns(request, plan)
  }

  // Auth/dashboard pages gate on a real Kratos session via whoami.
  const isAuthenticated = await isOrySessionActiveInProxy(request)

  const authRouteRedirect = getAuthRouteRedirect(request, isAuthenticated)
  if (authRouteRedirect) return authRouteRedirect

  return runProxyConcerns(request, plan, { isAuthenticated })
}

async function runProxyConcerns(
  request: NextRequest,
  plan: ProxyPlan,
  options: RunProxyOptions = {}
): Promise<Response> {
  try {
    if (plan.kind !== 'bypass' && plan.kind !== 'trpc') {
      const redirect = handleMiddlewareRedirect(request)
      if (redirect) return redirect

      const routeRewrite = handleRouteRewritePassthrough(request)
      if (routeRewrite) return routeRewrite

      const middlewareRewrite = handleMiddlewareRewrite(request)
      if (middlewareRewrite) return middlewareRewrite
    }

    if (plan.kind === 'auth-page' || plan.kind === 'dashboard-page') {
      return handleAuthGate(request, options.isAuthenticated ?? false)
    }

    return NextResponse.next({ request })
  } catch (error) {
    l.error(
      {
        key: 'middleware:unexpected_error',
        error: serializeErrorForLog(error),
        context: {
          pathname: request.nextUrl.pathname,
          teamSlug: request.nextUrl.pathname.split('/')[2],
        },
      },
      'middleware - unexpected error'
    )

    return NextResponse.next({ request })
  }
}
