import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { revokeCurrentSession } from '@/core/server/auth'
import {
  buildOryStartURL,
  normalizeOryReturnTo,
} from '@/core/server/auth/ory/build-start-url'
import { clearAppSessionCookies } from '@/core/server/auth/ory/clear-session-cookies'

// "Use a different account" from the reauth (refresh) login screen. Unlike
// sign-out, this does not bounce through Hydra's RP-logout: with login accepted
// remember=false Hydra holds no session, so the only thing pinning the last
// identity is the Kratos session. We revoke the current session (tokens +
// Kratos), clear the cookies, and start a fresh sign-in — Kratos then has no
// session and renders a normal login form, letting the user authenticate as
// anyone. The in-flight login_challenge is intentionally orphaned; the start
// route mints a fresh one.
export async function GET(request: NextRequest) {
  const returnTo = normalizeOryReturnTo(
    request.nextUrl.searchParams.get('returnTo')
  )

  await revokeCurrentSession()

  const response = NextResponse.redirect(
    new URL(buildOryStartURL('signin', returnTo), request.nextUrl.origin)
  )
  clearAppSessionCookies(request, response)
  return response
}
