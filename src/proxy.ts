import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { auth as authjsMiddleware } from '@/auth'
import { ALLOW_SEO_INDEXING, isOryAuthEnabled } from './configs/flags'
import { createAuthForProxy } from './core/server/auth'
import { getAuthRedirect } from './core/server/http/proxy'
import { l, serializeErrorForLog } from './core/shared/clients/logger/logger'
import { getMiddlewareRedirectFromPath } from './lib/utils/redirects'
import { getRewriteForPath } from './lib/utils/rewrites'

async function proxyCore(
  request: NextRequest,
  resolvedIsAuthenticated?: boolean
): Promise<Response> {
  try {
    const pathname = request.nextUrl.pathname

    // Redirects, that require custom headers
    // NOTE: We don't handle this via config matchers, because nextjs configs need to be static
    const middlewareRedirect = getMiddlewareRedirectFromPath(
      request.nextUrl.pathname
    )

    if (middlewareRedirect) {
      const headers = new Headers(middlewareRedirect.headers)
      const url = new URL(middlewareRedirect.destination, request.url)

      return NextResponse.redirect(url, {
        status: middlewareRedirect.statusCode,
        headers,
      })
    }

    // Catch-all route rewrite paths should not be handled by middleware
    // NOTE: We don't handle this via config matchers, because nextjs configs need to be static
    const { config: routeRewriteConfig } = getRewriteForPath(pathname, 'route')

    if (routeRewriteConfig) {
      return NextResponse.next({
        request,
      })
    }

    // Check if the path should be rewritten by middleware
    const { config: middlewareRewriteConfig, rule: middlewareRewriteRule } =
      getRewriteForPath(pathname, 'middleware')

    if (middlewareRewriteConfig) {
      const rewriteUrl = new URL(request.url)
      rewriteUrl.hostname = middlewareRewriteConfig.domain
      rewriteUrl.protocol = 'https'
      rewriteUrl.port = ''
      if (middlewareRewriteRule?.pathPreprocessor) {
        rewriteUrl.pathname = middlewareRewriteRule.pathPreprocessor(
          rewriteUrl.pathname
        )
      }

      const headers = new Headers(request.headers)

      if (ALLOW_SEO_INDEXING) {
        headers.set('x-e2b-should-index', '1')
      }

      const response = NextResponse.rewrite(rewriteUrl, {
        request: {
          headers,
        },
      })

      if (ALLOW_SEO_INDEXING) {
        response.headers.set('X-Robots-Tag', 'index, follow')
      } else {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      }

      return response
    }

    const response = NextResponse.next({
      request,
    })

    let isAuthenticated: boolean
    if (resolvedIsAuthenticated !== undefined) {
      isAuthenticated = resolvedIsAuthenticated
    } else {
      const authContext = await createAuthForProxy(
        request,
        response
      ).getAuthContext()
      isAuthenticated = !!authContext
    }

    const authRedirect = getAuthRedirect(request, isAuthenticated)

    if (authRedirect) {
      return authRedirect
    }

    return response
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

const proxyWithOryAuth = authjsMiddleware(async (req, _event: NextFetchEvent) =>
  proxyCore(req, !!req.auth)
)

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isOryAuthEnabled()) {
    return proxyWithOryAuth(request, event)
  }
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
