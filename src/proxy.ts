import { type NextRequest, NextResponse } from 'next/server'
import {
  handleAuthGate,
  handleMiddlewareRedirect,
  handleMiddlewareRewrite,
  handleRouteRewritePassthrough,
} from './core/server/http/proxy'
import { l, serializeErrorForLog } from './core/shared/clients/logger/logger'

// Runs the proxy's ordered concerns: the first handler that returns a Response
// wins; otherwise we fall through to the auth gate.
async function proxyCore(request: NextRequest): Promise<Response> {
  try {
    return (
      handleMiddlewareRedirect(request) ??
      handleRouteRewritePassthrough(request) ??
      handleMiddlewareRewrite(request) ??
      (await handleAuthGate(request))
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
    return NextResponse.next({
      request,
    })
  }
}

export async function proxy(request: NextRequest) {
  return proxyCore(request)
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
