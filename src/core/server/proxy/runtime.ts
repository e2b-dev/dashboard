import 'server-cli-only'

import { createOryMiddleware } from '@ory/nextjs/middleware'
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { auth as authjsMiddleware } from '@/auth'
import { isOryCustomUiEnabled } from '@/configs/flags'
import oryConfig from '@/configs/ory'
import { isOrySessionAuthenticated } from '@/core/server/auth/ory/authjs-session-boundary'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getAuthRouteRedirect } from './auth-routes'
import {
  classifyProxyRequest,
  type ProxyPlan,
  planNeedsAuthJsSession,
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

// Path prefixes the @ory/nextjs proxy forwards to the Ory SDK (Kratos public,
// from NEXT_PUBLIC_ORY_SDK_URL). The custom login UI's flow creation and form
// submit go through these same-origin paths so Kratos cookies stay first-party;
// see src/configs/ory.ts and src/app/login/page.tsx. Mirrors the
// match list inside createOryMiddleware.
const ORY_SDK_PROXY_PREFIXES = [
  '/self-service',
  '/sessions/whoami',
  '/ui',
  '/.well-known/ory',
  '/.ory',
]

// Created once; the returned closure reads NEXT_PUBLIC_ORY_SDK_URL lazily at
// request time, so this is inert when the custom UI is disabled.
//
// Pass the same `project` config as @ory/elements-react: the middleware's
// rewriteUrls() uses its built-in Ory-path↔ui_url table to rewrite Kratos
// redirect Location headers / response bodies (e.g. /login, /registration) onto
// our own UI URLs. Without it those rewrites are no-ops.
const oryProxy = createOryMiddleware({ project: oryConfig.project })

function isOrySdkProxyPath(pathname: string): boolean {
  return ORY_SDK_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function runDashboardProxy(
  request: NextRequest,
  event: NextFetchEvent
) {
  // Ory SDK traffic (/self-service, /sessions/whoami, …) must be forwarded to
  // Kratos before anything else. These paths classify as a bypass, so the
  // routing below would otherwise send them to Next instead of Kratos —
  // breaking the custom UI's flow creation and form submits. Only the custom
  // Elements UI needs this same-origin proxy (gated, so production is
  // unaffected).
  if (
    isOryCustomUiEnabled() &&
    isOrySdkProxyPath(request.nextUrl.pathname)
  ) {
    return oryProxy(request)
  }

  const plan = classifyProxyRequest(request.nextUrl.pathname)

  if (!planNeedsAuthJsSession(plan)) {
    return runProxyConcerns(request, plan)
  }

  const proxyWithAuth = authjsMiddleware((req, _event: NextFetchEvent) => {
    const isAuthenticated = isOrySessionAuthenticated(req.auth)
    const authRouteRedirect = getAuthRouteRedirect(req, isAuthenticated)
    if (authRouteRedirect) return authRouteRedirect

    return runProxyConcerns(req, plan, { isAuthenticated })
  })

  return proxyWithAuth(request, event)
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

export const proxyConfig = {
  matcher: [
    '/((?!_next/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
