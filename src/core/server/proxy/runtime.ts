import 'server-cli-only'

import { type NextRequest, NextResponse } from 'next/server'
import { COOKIE_KEYS } from '@/configs/cookies'
import { PROTECTED_ROUTE_PREFIXES, PROTECTED_URLS } from '@/configs/urls'

/**
 * Returns the api key for the current request, edge-safe. Mirrors
 * `getApiKey()` in core/server/auth (which is node-only via next/headers).
 */
function getRequestApiKey(request: NextRequest): string | null {
  const envApiKey = process.env.E2B_API_KEY
  if (envApiKey) return envApiKey

  return request.cookies.get(COOKIE_KEYS.API_KEY)?.value ?? null
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/**
 * The dashboard proxy is a thin auth gate:
 * - `/` with an api key present redirects into the dashboard.
 * - Protected routes without an api key redirect to `/` (the key form),
 *   preserving the original destination via `returnTo`.
 *
 * The cookie's presence is checked here for UX only — validity is enforced
 * lazily: upstream 401s surface as UNAUTHORIZED and sign the user out.
 */
export async function runDashboardProxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const apiKey = getRequestApiKey(request)

  if (pathname === '/' && apiKey) {
    const tab = request.nextUrl.searchParams.get('tab')
    // `/?tab=` deep links are resolved by the root page itself; only bare `/`
    // short-circuits here.
    if (!tab) {
      return NextResponse.redirect(
        new URL(PROTECTED_URLS.SANDBOXES, request.url)
      )
    }
  }

  if (isProtectedRoute(pathname) && !apiKey) {
    const returnToUrl = new URL('/', request.url)
    returnToUrl.searchParams.set('returnTo', `${pathname}${search}`)
    return NextResponse.redirect(returnToUrl)
  }

  return NextResponse.next({ request })
}
