import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { auth as authjsMiddleware } from '@/auth'
import { isOryAuthEnabled } from './configs/flags'
import { getOryAuthRouteRedirect } from './core/server/auth/ory/auth-route-redirect'
import {
  createForwardedOryAuthHeaders,
  isOrySessionAuthenticated,
  stripForwardedOryAuthHeaders,
} from './core/server/auth/ory/authjs-session-boundary'
import {
  handleAuthGate,
  handleMiddlewareRedirect,
  handleMiddlewareRewrite,
  handleRouteRewritePassthrough,
} from './core/server/http/proxy'
import {
  classifyProxyRequest,
  type ProxyPlan,
} from './core/server/http/proxy-plan'
import { l, serializeErrorForLog } from './core/shared/clients/logger/logger'

type ProxyCoreOptions = {
  knownAuth?: boolean
  requestHeaders?: Headers
}

// Runs the selected proxy concerns in order; the first handler that returns a
// Response wins. Ory mode supplies `knownAuth` from the Auth.js wrapper and may
// add verified auth headers for downstream API handlers.
async function proxyCore(
  request: NextRequest,
  plan: ProxyPlan,
  options: ProxyCoreOptions = {}
): Promise<Response> {
  const requestHeaders =
    options.requestHeaders ?? stripForwardedOryAuthHeaders(request.headers)

  try {
    if (plan.runMiddlewareRedirect) {
      const response = handleMiddlewareRedirect(request)
      if (response) return response
    }

    if (plan.runRouteRewritePassthrough) {
      const response = handleRouteRewritePassthrough(request, requestHeaders)
      if (response) return response
    }

    if (plan.runMiddlewareRewrite) {
      const response = handleMiddlewareRewrite(request, requestHeaders)
      if (response) return response
    }

    if (plan.runAuthGate) {
      return handleAuthGate(request, options.knownAuth, requestHeaders)
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
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

    // return a basic response to avoid infinite loops
    return NextResponse.next({ request: { headers: requestHeaders } })
  }
}

function proxyWithOryAuth(
  request: NextRequest,
  event: NextFetchEvent,
  plan: ProxyPlan
) {
  const proxyWithAuth = authjsMiddleware((req, _event: NextFetchEvent) => {
    const isAuthenticated = isOrySessionAuthenticated(req.auth)
    const requestHeaders = plan.forwardVerifiedOryAuth
      ? createForwardedOryAuthHeaders(req.headers, req.auth)
      : stripForwardedOryAuthHeaders(req.headers)

    if (plan.runAuthRouteRedirect) {
      const authRouteRedirect = getOryAuthRouteRedirect(req, isAuthenticated)
      if (authRouteRedirect) return authRouteRedirect
    }

    return proxyCore(req, plan, {
      knownAuth: isAuthenticated,
      requestHeaders,
    })
  })

  return proxyWithAuth(request, event)
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const plan = classifyProxyRequest(request.nextUrl.pathname)

  if (!isOryAuthEnabled() || !plan.needsOryAuthJsSession) {
    return proxyCore(request, plan)
  }

  return proxyWithOryAuth(request, event, plan)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/ (Next.js internals: static files, image optimization, etc.)
     * - static icons and images - .ico, .svg, .png, .jpg, .jpeg, .gif, .webp
     * - vercel analytics route
     * - posthog routes
     * - mintlify docs asset routes (rewritten in next.config.ts)
     */
    '/((?!_next/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
