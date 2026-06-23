import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/core/server/auth'
import { clearAppSessionCookies } from '@/core/server/auth/ory/clear-session-cookies'

// Sign-out is a plain route handler the client hard-navigates to, so the logout
// overlay stays up until the document unloads. signOut() revokes the OAuth
// tokens and the Kratos identity session server-side, and the redirect ends
// Hydra's OAuth2 session; we drop the browser cookies here.
export async function GET(request: NextRequest) {
  const { redirectTo } = await signOut({ origin: request.nextUrl.origin })
  const response = NextResponse.redirect(
    new URL(redirectTo, request.nextUrl.origin)
  )
  clearAppSessionCookies(request, response)
  return response
}
