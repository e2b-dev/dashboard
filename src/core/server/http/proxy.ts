import 'server-cli-only'

import { type NextRequest, NextResponse } from 'next/server'
import { ALLOW_SEO_INDEXING } from '@/configs/flags'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { createAuthForProxy } from '@/core/server/auth'
import { getMiddlewareRedirectFromPath } from '@/lib/utils/redirects'
import { getRewriteForPath } from '@/lib/utils/rewrites'
import { isProxyAuthRoute, isProxyDashboardRoute } from './proxy-plan'

export { isProxyAuthRoute as isAuthRoute }
export { isProxyDashboardRoute as isDashboardRoute }

function isDashboardTerminalRoute(pathname: string): boolean {
  return (
    pathname === '/dashboard/terminal' || pathname === '/dashboard/terminal/'
  )
}

export function buildRedirectUrl(path: string, request: NextRequest): URL {
  return new URL(path, request.url)
}

export function getAuthRedirect(
  request: NextRequest,
  isAuthenticated: boolean
): NextResponse | null {
  if (
    isProxyDashboardRoute(request.nextUrl.pathname) &&
    !isDashboardTerminalRoute(request.nextUrl.pathname) &&
    !isAuthenticated
  ) {
    return NextResponse.redirect(buildRedirectUrl(AUTH_URLS.SIGN_IN, request))
  }

  if (isProxyAuthRoute(request.nextUrl.pathname) && isAuthenticated) {
    return NextResponse.redirect(
      buildRedirectUrl(PROTECTED_URLS.DASHBOARD, request)
    )
  }

  return null
}

// The handlers below are the ordered concerns the proxy runs for every request.
// Each returns a Response when it handles the request, or null to fall through
// to the next concern. They live here (not in static next.config matchers)
// because they need custom headers / runtime path logic.

// Redirects that require custom response headers.
export function handleMiddlewareRedirect(
  request: NextRequest
): NextResponse | null {
  const redirect = getMiddlewareRedirectFromPath(request.nextUrl.pathname)
  if (!redirect) return null

  return NextResponse.redirect(new URL(redirect.destination, request.url), {
    status: redirect.statusCode,
    headers: new Headers(redirect.headers),
  })
}

// Catch-all route rewrites are resolved by the route itself, so the proxy just
// passes them through untouched.
export function handleRouteRewritePassthrough(
  request: NextRequest,
  requestHeaders: Headers
): NextResponse | null {
  const { config } = getRewriteForPath(request.nextUrl.pathname, 'route')
  return config
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : null
}

// Rewrites the proxy performs itself (serving another origin under our domain),
// tagging the request/response with the SEO-indexing intent.
export function handleMiddlewareRewrite(
  request: NextRequest,
  requestHeaders: Headers
): NextResponse | null {
  const { config, rule } = getRewriteForPath(
    request.nextUrl.pathname,
    'middleware'
  )
  if (!config) return null

  const rewriteUrl = new URL(request.url)
  rewriteUrl.hostname = config.domain
  rewriteUrl.protocol = 'https'
  rewriteUrl.port = ''
  if (rule?.pathPreprocessor) {
    rewriteUrl.pathname = rule.pathPreprocessor(rewriteUrl.pathname)
  }

  const rewriteRequestHeaders = new Headers(requestHeaders)
  if (ALLOW_SEO_INDEXING) {
    rewriteRequestHeaders.set('x-e2b-should-index', '1')
  }

  const response = NextResponse.rewrite(rewriteUrl, {
    request: { headers: rewriteRequestHeaders },
  })
  response.headers.set(
    'X-Robots-Tag',
    ALLOW_SEO_INDEXING ? 'index, follow' : 'noindex, nofollow'
  )
  return response
}

// Terminal concern: gate dashboard/auth routes on authentication. `knownAuth`
// is supplied in Ory mode (resolved by the Auth.js middleware wrapper); in
// Supabase mode it's resolved here from the request/response cookies.
export async function handleAuthGate(
  request: NextRequest,
  knownAuth: boolean | undefined,
  requestHeaders: Headers
): Promise<Response> {
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  const isAuthenticated =
    knownAuth ??
    !!(await createAuthForProxy(request, response).getAuthContext())

  return getAuthRedirect(request, isAuthenticated) ?? response
}
