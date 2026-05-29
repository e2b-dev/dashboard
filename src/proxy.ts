import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import type { Session } from 'next-auth'
import { auth as authjsMiddleware } from '@/auth'
import { isOryAuthEnabled } from './configs/flags'
import { getOryAuthRouteRedirect } from './core/server/auth/ory/auth-route-redirect'
import {
  handleAuthGate,
  handleMiddlewareRedirect,
  handleMiddlewareRewrite,
  handleRouteRewritePassthrough,
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

// req.auth is truthy even when the session carries a RefreshTokenError, so we
// must check session.error too — otherwise the auth-route guard treats a
// poisoned session as "logged in" and ping-pongs the user between /dashboard
// (redirects to /sign-in via getAuthContext()) and /sign-in (redirects back to
// /dashboard via the proxy's authenticated-on-auth-route rule).
function isSessionAuthenticated(session: Session | null): boolean {
  return !!session && !session.error
}

// In Ory mode the Auth.js middleware wrapper populates req.auth and manages its
// session cookies, so auth is resolved here and threaded into proxyCore.
const proxyWithOryAuth = authjsMiddleware((req, _event: NextFetchEvent) =>
  proxyCore(req, isSessionAuthenticated(req.auth))
)

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isOryAuthEnabled()) {
    return proxyCore(request)
  }

  // Bounce the legacy auth pages straight to the Ory hosted UI before the
  // (auth) layout can render.
  const authRouteRedirect = getOryAuthRouteRedirect(request)
  if (authRouteRedirect) return authRouteRedirect

  return proxyWithOryAuth(request, event)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - api routes
     * - vercel analytics route
     * - posthog routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
