import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { AUTH_URLS } from '@/configs/urls'
import { l } from '@/core/shared/clients/logger/logger'

// Auth.js renders its built-in `${basePath}/error` page when something fails
// during the OAuth dance (most commonly a stale state/PKCE/nonce cookie that
// expired while the user lingered on the Ory hosted UI). We point
// `pages.error` here so the user never sees that page - we log the failure
// for observability and bounce them back to /sign-in, which restarts the
// flow with fresh cookies via the middleware -> oauth-start chain.
//
// A short-lived cookie prevents tight loops when the underlying failure is
// genuinely persistent (e.g. ORY_SDK_URL misconfigured). After one recovery
// attempt in the window, subsequent failures fall back to the marketing
// root so the user isn't bounced indefinitely.
const RECOVERY_COOKIE = 'auth_recover_attempted'
const RECOVERY_COOKIE_MAX_AGE_SECONDS = 30

export async function GET(request: NextRequest) {
  const errorCode = request.nextUrl.searchParams.get('error') ?? 'unknown'
  const alreadyAttempted = request.cookies.get(RECOVERY_COOKIE)?.value === '1'

  l.error(
    {
      key: 'oauth_recover:auth_js_error',
      context: { error_code: errorCode, already_attempted: alreadyAttempted },
    },
    'Auth.js OAuth flow failed; recovering user'
  )

  const destination = alreadyAttempted ? '/' : AUTH_URLS.SIGN_IN
  const response = NextResponse.redirect(new URL(destination, request.url))

  if (alreadyAttempted) {
    response.cookies.delete(RECOVERY_COOKIE)
  } else {
    response.cookies.set(RECOVERY_COOKIE, '1', {
      maxAge: RECOVERY_COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  return response
}
