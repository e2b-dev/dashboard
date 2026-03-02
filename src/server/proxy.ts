import 'server-cli-only'

import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'

export function isAuthRoute(pathname: string): boolean {
  return (
    pathname.includes(AUTH_URLS.SIGN_IN) ||
    pathname.includes(AUTH_URLS.SIGN_UP) ||
    pathname.includes(AUTH_URLS.FORGOT_PASSWORD)
  )
}

export function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith(PROTECTED_URLS.DASHBOARD)
}

export function buildRedirectUrl(path: string, request: NextRequest): URL {
  return new URL(path, request.url)
}

export function getAuthRedirect(
  request: NextRequest,
  isAuthenticated: boolean
): NextResponse | null {
  if (isDashboardRoute(request.nextUrl.pathname) && !isAuthenticated) {
    return NextResponse.redirect(buildRedirectUrl(AUTH_URLS.SIGN_IN, request))
  }

  if (isAuthRoute(request.nextUrl.pathname) && isAuthenticated) {
    return NextResponse.redirect(
      buildRedirectUrl(PROTECTED_URLS.DASHBOARD, request)
    )
  }

  return null
}
