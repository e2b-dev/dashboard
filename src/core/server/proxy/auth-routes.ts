import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'
import {
  buildOryStartURL,
  type OryAuthIntent,
} from '@/core/server/auth/ory/build-start-url'
import { resolvePublicOrigin } from '@/core/server/auth/ory/oauth-relay'

const INTENT_BY_PATH: Record<string, OryAuthIntent> = {
  '/sign-in': 'signin',
  '/sign-up': 'signup',
  '/forgot-password': 'signin',
}

export function getAuthRouteRedirect(
  request: NextRequest,
  isAuthenticated = false
): NextResponse | null {
  const origin = resolvePublicOrigin(request.nextUrl.origin)
  const intent = getAuthIntentFromPath(request.nextUrl.pathname)
  if (!intent) return null

  if (isAuthenticated) {
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, origin))
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? undefined
  const target = new URL(buildOryStartURL(intent, returnTo), origin)

  return NextResponse.redirect(target)
}

export function getAuthIntentFromPath(pathname: string): OryAuthIntent | null {
  return INTENT_BY_PATH[normalizeAuthPath(pathname)] ?? null
}

export function normalizeAuthPath(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}
