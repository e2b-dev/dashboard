import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'
import { buildOryStartURL, type OryAuthIntent } from './build-start-url'

// Map each dashboard auth page to the intent we want the Ory hosted UI to
// open with. Done at the middleware layer so the (auth) layout never
// renders in Ory mode - otherwise the user briefly sees the auth shell
// before the page-level redirect kicks in.
const INTENT_BY_PATH: Record<string, OryAuthIntent> = {
  '/sign-in': 'signin',
  '/sign-up': 'signup',
  '/forgot-password': 'signin',
}

export function getOryAuthRouteRedirect(
  request: NextRequest,
  isAuthenticated = false
): NextResponse | null {
  const intent = getOryAuthIntentFromPath(request.nextUrl.pathname)
  if (!intent) return null

  if (isAuthenticated) {
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? undefined
  const target = new URL(buildOryStartURL(intent, returnTo), request.url)

  return NextResponse.redirect(target)
}

export function getOryAuthIntentFromPath(
  pathname: string
): OryAuthIntent | null {
  return INTENT_BY_PATH[normalizeAuthPath(pathname)] ?? null
}

export function normalizeAuthPath(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}
