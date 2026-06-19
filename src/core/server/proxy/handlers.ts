import 'server-cli-only'

import { type NextRequest, NextResponse } from 'next/server'
import { ALLOW_SEO_INDEXING } from '@/configs/env-flags'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getMiddlewareRedirectFromPath } from '@/lib/utils/redirects'
import { getRewriteForPath } from '@/lib/utils/rewrites'
import { isProxyAuthRoute, isProxyDashboardRoute } from './classifier'

export function getAuthRedirect(
  request: NextRequest,
  isAuthenticated: boolean
): NextResponse | null {
  if (isProxyDashboardRoute(request.nextUrl.pathname) && !isAuthenticated) {
    const signInUrl = new URL(AUTH_URLS.SIGN_IN, request.url)
    signInUrl.searchParams.set(
      'returnTo',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )

    return NextResponse.redirect(signInUrl)
  }

  if (isProxyAuthRoute(request.nextUrl.pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  return null
}

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

export function handleRouteRewritePassthrough(
  request: NextRequest
): NextResponse | null {
  const { config } = getRewriteForPath(request.nextUrl.pathname, 'route')
  return config ? NextResponse.next({ request }) : null
}

export function handleMiddlewareRewrite(
  request: NextRequest
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

  const requestHeaders = new Headers(request.headers)
  if (ALLOW_SEO_INDEXING) {
    requestHeaders.set('x-e2b-should-index', '1')
  }

  const response = NextResponse.rewrite(rewriteUrl, {
    request: { headers: requestHeaders },
  })
  response.headers.set(
    'X-Robots-Tag',
    ALLOW_SEO_INDEXING ? 'index, follow' : 'noindex, nofollow'
  )
  return response
}

export function handleAuthGate(
  request: NextRequest,
  isAuthenticated: boolean
): Response {
  const response = NextResponse.next({ request })
  return getAuthRedirect(request, isAuthenticated) ?? response
}
