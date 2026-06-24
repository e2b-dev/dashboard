import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS } from '@/configs/urls'
import { handleCredentialChangeSuccess } from '@/core/server/auth'
import { clearAppSessionCookies } from '@/core/server/auth/ory/clear-session-cookies'

// Post-recovery password reset on /settings completed. The Kratos session minted
// by the recovery flow is still live, so a bare redirect to /sign-in lets Hydra
// silently mint tokens off it without a password prompt. Revoke every session
// for the identity (this device plus any other live session, e.g. a takeover's
// session elsewhere) and clear cookies before sending the user to /sign-in to
// authenticate with the new password.
export async function GET(request: NextRequest) {
  await handleCredentialChangeSuccess()

  const response = NextResponse.redirect(
    new URL(AUTH_URLS.SIGN_IN, request.nextUrl.origin)
  )
  clearAppSessionCookies(request, response)
  return response
}
