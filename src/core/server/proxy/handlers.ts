import 'server-cli-only'

import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
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

export function handleAuthGate(
  request: NextRequest,
  isAuthenticated: boolean
): Response {
  const response = NextResponse.next({ request })
  return getAuthRedirect(request, isAuthenticated) ?? response
}
