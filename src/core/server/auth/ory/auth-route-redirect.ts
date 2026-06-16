import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'

// Map each legacy (Supabase-era) auth page to its same-origin Kratos flow page.
// Done at the middleware layer so the (auth) layout never renders the legacy
// shell in Ory mode before a page-level redirect kicks in.
const FLOW_PATH_BY_AUTH_PATH: Record<string, string> = {
  '/sign-in': '/login',
  '/sign-up': '/registration',
  '/forgot-password': '/recovery',
}

export function getOryAuthRouteRedirect(
  request: NextRequest,
  isAuthenticated = false
): NextResponse | null {
  const flowPath = getOryFlowPathForAuthRoute(request.nextUrl.pathname)
  if (!flowPath) return null

  if (isAuthenticated) {
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  const target = new URL(flowPath, request.url)
  // Carry the post-login destination through as Kratos' return_to.
  const returnTo =
    request.nextUrl.searchParams.get('returnTo') ??
    request.nextUrl.searchParams.get('return_to')
  if (returnTo) target.searchParams.set('return_to', returnTo)

  return NextResponse.redirect(target)
}

export function getOryFlowPathForAuthRoute(pathname: string): string | null {
  return FLOW_PATH_BY_AUTH_PATH[normalizeAuthPath(pathname)] ?? null
}

export function normalizeAuthPath(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}
