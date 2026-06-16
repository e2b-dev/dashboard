import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'
import {
  buildOryStartURL,
  type OryAuthIntent,
} from '@/core/server/auth/ory/build-start-url'

const INTENT_BY_PATH: Record<string, OryAuthIntent> = {
  '/sign-in': 'signin',
  '/sign-up': 'signup',
  '/forgot-password': 'signin',
}

export function getAuthRouteRedirect(
  request: NextRequest,
  isAuthenticated = false
): NextResponse | null {
  const intent = getAuthIntentFromPath(request.nextUrl.pathname)
  if (!intent) return null

  if (isAuthenticated) {
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? undefined
  const target = new URL(buildOryStartURL(intent, returnTo), request.url)

  return NextResponse.redirect(target)
}

export function getAuthIntentFromPath(pathname: string): OryAuthIntent | null {
  return INTENT_BY_PATH[normalizeAuthPath(pathname)] ?? null
}

export function normalizeAuthPath(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}
