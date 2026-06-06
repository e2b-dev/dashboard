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

// Match the Ory auth provider's AuthContext requirements. req.auth can be
// truthy while missing the user id/access token, or while carrying a
// RefreshTokenError; in those cases the server auth context is unauthenticated.
function isSessionAuthenticated(session: Session | null): boolean {
  return !!session?.user?.id && !!session.accessToken && !session.error
}

// In Ory mode the Auth.js middleware wrapper populates req.auth and manages its
// session cookies, so auth is resolved here and threaded into proxyCore. Auth
// pages still bypass the local UI, but only after checking whether an existing
// session should send the user back to the dashboard instead of the hosted UI.
const proxyWithOryAuth = authjsMiddleware((req, _event: NextFetchEvent) => {
  const isAuthenticated = isSessionAuthenticated(req.auth)
  const authRouteRedirect = getOryAuthRouteRedirect(req, isAuthenticated)
  if (authRouteRedirect) return authRouteRedirect

  return proxyCore(req, isAuthenticated)
})

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isOryAuthEnabled()) {
    return proxyCore(request)
  }

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
