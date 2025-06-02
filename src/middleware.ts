import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  getAuthRedirect,
  getUserSession,
  handleTeamResolution,
  isAuthRoute,
  isDashboardRoute,
  resolveTeamForDashboard,
} from './server/middleware'
import { PROTECTED_URLS } from './configs/urls'
import { logError } from './lib/clients/logger'
import { ERROR_CODES } from './configs/logs'
import {
  getRewriteForPath,
  rewriteContentPagesHtml,
} from './lib/utils/rewrites'
import { NO_INDEX } from './lib/utils/flags'

export async function middleware(request: NextRequest) {
  try {
    // Catch-all route rewrite paths should not be handled by middleware
    // NOTE: We don't handle this via config matchers, because nextjs configs need to be static
    const { config: routeRewriteConfig } = getRewriteForPath(
      request.nextUrl.pathname,
      'route'
    )

    if (routeRewriteConfig) {
      return NextResponse.next({
        request,
      })
    }

    // Check if the path should be rewritten by middleware
    const { config: middlewareRewriteConfig } = getRewriteForPath(
      request.nextUrl.pathname,
      'middleware'
    )

    if (middlewareRewriteConfig) {
      const rewriteUrl = new URL(request.url)
      rewriteUrl.hostname = middlewareRewriteConfig.domain
      rewriteUrl.protocol = 'https'
      rewriteUrl.port = ''

      const rewriteResponse = await fetch(rewriteUrl, {
        headers: {
          'User-Agent': request.headers.get('User-Agent') || '',
          'Accept-Language': request.headers.get('Accept-Language') || '',
          'Accept-Encoding': request.headers.get('Accept-Encoding') || '',
          Accept: request.headers.get('Accept') || '',
          'Sec-Fetch-Dest': request.headers.get('Sec-Fetch-Dest') || '',
          'Sec-Fetch-Mode': request.headers.get('Sec-Fetch-Mode') || '',
          'Sec-Fetch-Site': request.headers.get('Sec-Fetch-Site') || '',
          'Sec-Fetch-User': request.headers.get('Sec-Fetch-User') || '',
          'X-Forwarded-Host': request.headers.get('host') || '',
          'X-Forwarded-Proto':
            request.headers.get('x-forwarded-proto') || 'https',
          'X-Forwarded-For':
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            '',
          'X-Real-IP': request.headers.get('x-real-ip') || '',
          'Cache-Control': 'private, no-store, max-age=0',
          Referer: request.headers.get('referer') || '',
        },
        redirect: 'follow',
        cache: 'no-store',
      })

      const html = rewriteContentPagesHtml(await rewriteResponse.text(), {
        seo: {
          pathname: request.nextUrl.pathname,
          isNoIndex: NO_INDEX,
        },
        hrefPrefixes: [
          `https://${middlewareRewriteConfig.domain}`,
          'https://e2b.dev',
        ],
      })

      return new NextResponse(html, {
        headers: rewriteResponse.headers,
      })
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

    // Redirect to dashboard if user is logged in and on auth routes
    if (
      isAuthRoute(request.nextUrl.pathname) &&
      (await supabase.auth.getSession()).data.session
    ) {
      return NextResponse.redirect(
        new URL(PROTECTED_URLS.DASHBOARD, request.url)
      )
    }

    // Refresh session and handle auth redirects
    const { error, data } = await getUserSession(supabase)

    // Handle authentication redirects
    const authRedirect = getAuthRedirect(request, !error)
    if (authRedirect) return authRedirect

    // Early return for non-dashboard routes or no user
    if (!data?.user || !isDashboardRoute(request.nextUrl.pathname)) {
      return response
    }

    // Handle team resolution for all dashboard routes
    const teamResult = await resolveTeamForDashboard(request, data.user.id)

    // Process team resolution result
    return handleTeamResolution(request, response, teamResult)
  } catch (error) {
    logError(ERROR_CODES.MIDDLEWARE, error)
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
     * - sentry routes
     * - posthog routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|_vercel/|monitoring|ingest/).*)',
  ],
}
