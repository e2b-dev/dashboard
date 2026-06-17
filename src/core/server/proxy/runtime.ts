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

// Same-origin paths the @ory/nextjs proxy forwards to the Ory base
// (NEXT_PUBLIC_ORY_SDK_URL), so the custom UI's flow cookies stay first-party.
// `/oauth2/auth` is the Hydra authorize leg: proxying it keeps the OAuth2 login
// on the visiting origin (the proxy rewrites Hydra's login_ui_url redirect back
// here) instead of hopping to the Ory custom domain. On Ory Network Kratos +
// Hydra share one base, so this resolves correctly; locally the authorize host
// never points here (see same-origin-oauth.ts), so this prefix stays inert.
const ORY_SDK_PROXY_PREFIXES = [
  '/self-service',
  '/sessions/whoami',
  '/ui',
  '/.well-known/ory',
  '/.ory',
  '/oauth2/auth',
]

// Pass oryConfig.project so the middleware rewrites Kratos redirects onto our UI URLs.
const oryProxy = createOryMiddleware({ project: oryConfig.project })

function isOrySdkProxyPath(pathname: string): boolean {
  return ORY_SDK_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function runDashboardProxy(
  request: NextRequest,
  event: NextFetchEvent
) {
  // Forward Ory SDK traffic to Kratos before classification (it would otherwise
  // classify as a bypass and go to Next). Gated, so production is unaffected;
  // path check first so the gate runs only for these paths.
  if (isOrySdkProxyPath(request.nextUrl.pathname) && isOryCustomUiEnabled()) {
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
