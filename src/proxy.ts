import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { isOryAuthEnabled } from './configs/flags'
import {
  getOryAuthRouteRedirect,
  getOryFlowPathForAuthRoute,
} from './core/server/auth/ory/auth-route-redirect'
import {
  isOryProxyPath,
  isOrySessionActiveInProxy,
  oryProxyMiddleware,
} from './core/server/auth/ory/proxy-runtime'
import {
  handleAuthGate,
  handleMiddlewareRedirect,
  handleMiddlewareRewrite,
  handleRouteRewritePassthrough,
  isAuthRoute,
  isDashboardRoute,
} from './core/server/http/proxy'
import { l, serializeErrorForLog } from './core/shared/clients/logger/logger'

// Runs the proxy's ordered concerns: the first handler that returns a Response
// wins; otherwise we fall through to the auth gate. `knownAuth` is passed in Ory
// mode (resolved by the Auth.js middleware wrapper) and omitted in Supabase mode.
async function proxyCore(
  request: NextRequest,
  knownAuth?: boolean
): Promise<Response> {
  try {
    return (
      handleMiddlewareRedirect(request) ??
      handleRouteRewritePassthrough(request) ??
      handleMiddlewareRewrite(request) ??
      (await handleAuthGate(request, knownAuth))
    )
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
    return NextResponse.next({ request })
  }
}

// In Ory mode we (1) serve the Kratos self-service + whoami endpoints from this
// origin via the @ory/nextjs proxy (so the flow stays on previews), and (2) gate
// auth/dashboard routes on a real whoami check. The session status is resolved
// here (middleware can't use getServerSession) and threaded into proxyCore as
// knownAuth so the terminal auth gate never re-resolves it server-side.
async function proxyWithOryAuth(request: NextRequest): Promise<Response> {
  if (isOryProxyPath(request.nextUrl.pathname)) {
    return oryProxyMiddleware(request)
  }

  const pathname = request.nextUrl.pathname
  const gateRelevant =
    isDashboardRoute(pathname) ||
    isAuthRoute(pathname) ||
    !!getOryFlowPathForAuthRoute(pathname)

  // whoami only where a redirect decision depends on it; elsewhere the value is
  // unused but must still be a boolean so the gate doesn't call the provider.
  const isAuthenticated = gateRelevant
    ? await isOrySessionActiveInProxy(request)
    : false

  const authRouteRedirect = getOryAuthRouteRedirect(request, isAuthenticated)
  if (authRouteRedirect) return authRouteRedirect

  return proxyCore(request, isAuthenticated)
}

export async function proxy(request: NextRequest, _event: NextFetchEvent) {
  if (!isOryAuthEnabled()) {
    return proxyCore(request)
  }

  return proxyWithOryAuth(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static icons and images - .ico, .svg, .png, .jpg, .jpeg, .gif, .webp
     * - api routes
     * - vercel analytics route
     * - posthog routes
     */
    '/((?!_next/static|_next/image|api/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
