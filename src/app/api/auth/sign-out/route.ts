import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/core/server/auth'
import {
  sessionCookieDeleteOptions,
  resolveSessionCookieDomain,
} from '@/core/server/auth/ory/session-cookie'

// Ory's identity session cookie: `ory_kratos_session` self-hosted,
// `ory_session_<slug>` on Ory Network. Deliberately excludes Hydra's
// `ory_hydra_session*` cookie, which the RP-logout redirect ends, not us.
const ORY_IDENTITY_SESSION_COOKIE = /^ory_(kratos_)?session/

// Sign-out is a plain route handler the client hard-navigates to, so the logout
// overlay stays up until the document unloads. signOut() revokes the Kratos
// identity session server-side and the redirect ends Hydra's OAuth2 session; we
// drop the browser cookies here — e2b_session (our token cache) and the Ory
// identity cookie, which Hydra's logout leaves in place.
export async function GET(request: NextRequest) {
  const { redirectTo } = await signOut({ origin: request.nextUrl.origin })
  const response = NextResponse.redirect(
    new URL(redirectTo, request.nextUrl.origin)
  )
  response.cookies.delete(sessionCookieDeleteOptions(request.nextUrl.host))
  clearOryIdentitySessionCookies(request, response)
  return response
}

// The cookie name and scope depend on the deployment, so clear whatever Ory
// identity cookie the browser actually sent, scoped the same way it was issued:
// parent-domain on Ory Network (how the @ory/nextjs proxy sets it, e.g.
// `.e2b-staging.dev`), host-only otherwise.
function clearOryIdentitySessionCookies(
  request: NextRequest,
  response: NextResponse
): void {
  const domain = resolveSessionCookieDomain(request.nextUrl.host)
  for (const { name } of request.cookies.getAll()) {
    if (!ORY_IDENTITY_SESSION_COOKIE.test(name)) continue
    response.cookies.delete(
      domain ? { name, path: '/', domain } : { name, path: '/' }
    )
  }
}
