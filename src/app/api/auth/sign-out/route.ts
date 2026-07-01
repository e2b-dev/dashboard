import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/core/server/auth'
import { clearAppSessionCookies } from '@/core/server/auth/ory/clear-session-cookies'
import { resolvePublicOrigin } from '@/core/server/auth/ory/oauth-relay'

// Sign-out is a plain route handler the client hard-navigates to, so the logout
// overlay stays up until the document unloads. signOut() revokes the OAuth
// tokens and the Kratos identity session server-side, and the redirect ends
// Hydra's OAuth2 session; we drop the browser cookies here.
export async function GET(request: NextRequest) {
  const origin = resolvePublicOrigin(request.nextUrl.origin)
  // `return_to` steers the post-logout landing for sessions without a Hydra
  // id_token (e.g. signing out of /settings mid-recovery → back to sign-in).
  const returnTo = request.nextUrl.searchParams.get('return_to') ?? undefined
  const { redirectTo } = await signOut({
    origin,
    returnTo,
  })
  const response = NextResponse.redirect(new URL(redirectTo, origin))
  clearAppSessionCookies(request, response)
  return response
}
