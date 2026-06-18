import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/core/server/auth'
import { E2B_SESSION_COOKIE } from '@/core/server/auth/ory/session-cookie'

// Sign-out is a plain route handler. It reads the id_token from e2b_session to
// build Hydra's RP-logout URL, then clears the cookie on the redirect it emits
// (before handing off to Hydra, which ends the Ory + Kratos sessions). The
// client hard-navigates here so the logout overlay stays up until the document
// unloads.
export async function GET(request: NextRequest) {
  const { redirectTo } = await signOut({ origin: request.nextUrl.origin })
  const response = NextResponse.redirect(
    new URL(redirectTo, request.nextUrl.origin)
  )
  response.cookies.delete(E2B_SESSION_COOKIE)
  return response
}
