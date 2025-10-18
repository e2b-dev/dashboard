import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { serializeError } from 'serialize-error'
import { ALLOW_SEO_INDEXING } from './configs/flags'
import { l } from './lib/clients/logger/logger'
import { getMiddlewareRedirectFromPath } from './lib/utils/redirects'
import { getRewriteForPath } from './lib/utils/rewrites'
import { getAuthRedirect } from './server/middleware'

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname

    l.debug(
      {
        key: 'middleware:start',
        pathname,
      },
      'middleware - start'
    )

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
      l.debug(
        {
          key: 'middleware:route_rewrite',
          pathname,
          config: routeRewriteConfig,
        },
        'middleware - route rewrite'
      )

      return NextResponse.next({
        request,
      })
    }

    // Check if the path should be rewritten by middleware
    const { config: middlewareRewriteConfig, rule: middlewareRewriteRule } =
      getRewriteForPath(pathname, 'middleware')

    if (middlewareRewriteConfig) {
      l.debug(
        {
          key: 'middleware:middleware_rewrite',
          pathname,
          domain: middlewareRewriteConfig.domain,
        },
        'middleware - middleware rewrite'
      )

      const rewriteUrl = new URL(request.url)
      rewriteUrl.hostname = middlewareRewriteConfig.domain
      rewriteUrl.protocol = 'https'
      rewriteUrl.port = ''
      if (middlewareRewriteRule && middlewareRewriteRule.pathPreprocessor) {
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

    // Setup response and Supabase client
    const response = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error, data } = await supabase.auth.getUser()

    l.debug(
      {
        key: 'middleware:user_auth',
        pathname,
        hasUser: !!data?.user,
        userId: data?.user?.id,
        hasError: !!error,
      },
      'middleware - user auth'
    )

    // Handle authentication redirects
    const authRedirect = getAuthRedirect(request, !error)
    if (authRedirect) {
      l.debug(
        {
          key: 'middleware:auth_redirect',
          pathname,
          redirectTo: authRedirect.headers.get('location'),
        },
        'middleware - auth redirect'
      )
      return authRedirect
    }

    // // Early return for non-dashboard routes or no user
    // if (!data?.user || !isDashboardRoute(pathname)) {
    //   l.debug({
    //     key: 'middleware:early_return',
    //     pathname,
    //     isDashboard: isDashboardRoute(pathname),
    //     hasUser: !!data?.user,
    //   })
    //   return response
    // }

    // // Handle team resolution for all dashboard routes
    // const teamResult = await resolveTeamForDashboard(request, data.user.id)

    // l.debug(
    //   {
    //     key: 'middleware:team_resolution',
    //     userId: data.user.id,
    //     context: {
    //       pathname,
    //       teamResult: teamResult,
    //       teamIdOrSlug: request.nextUrl.pathname.split('/')[2],
    //     },
    //   },
    //   'middleware - resolved team for dashboard'
    // )

    // // Process team resolution result
    // return handleTeamResolution(request, response, teamResult)
    return response
  } catch (error) {
    l.error(
      {
        key: 'middleware:unexpected_error',
        error: serializeError(error),
        context: {
          pathname: request.nextUrl.pathname,
          teamIdOrSlug: request.nextUrl.pathname.split('/')[2],
        },
      },
      'middleware - unexpected error'
    )
    // Return a basic response to avoid infinite loops
    return NextResponse.next({
      request,
    })
  }
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
