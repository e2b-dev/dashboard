import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'

// Maps the legacy entry paths to the same-origin Kratos Elements flow pages.
const FLOW_PATH_BY_AUTH_PATH: Record<string, string> = {
  '/sign-in': '/login',
  '/sign-up': '/registration',
  '/forgot-password': '/recovery',
}

export function getAuthRouteRedirect(
  request: NextRequest,
  isAuthenticated = false
): NextResponse | null {
  const flowPath = getFlowPathForAuthPath(request.nextUrl.pathname)
  if (!flowPath) return null

  if (isAuthenticated) {
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  // Forward to the Kratos flow page, preserving the post-login destination as
  // Ory's `return_to` query parameter.
  const returnTo = request.nextUrl.searchParams.get('returnTo')
  const target = new URL(flowPath, request.url)
  if (returnTo) target.searchParams.set('return_to', returnTo)

  return NextResponse.redirect(target)
}

export function getFlowPathForAuthPath(pathname: string): string | null {
  return FLOW_PATH_BY_AUTH_PATH[normalizeAuthPath(pathname)] ?? null
}

export function normalizeAuthPath(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}
