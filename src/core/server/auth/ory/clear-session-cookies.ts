import 'server-only'

import type { NextRequest, NextResponse } from 'next/server'
import {
  resolveSessionCookieDomain,
  sessionCookieDeleteOptions,
  sessionCookieNames,
} from './session-cookie'

// Ory's identity session cookie: `ory_kratos_session` self-hosted,
// `ory_session_<slug>` on Ory Network. Deliberately excludes Hydra's
// `ory_hydra_session*` cookie, which the RP-logout redirect ends, not us.
const ORY_IDENTITY_SESSION_COOKIE = /^ory_(kratos_)?session/

// Drops the browser-side session cookies on a logout response: e2b_session (our
// token cache) and the Ory identity cookie. The cookie name and scope depend on
// the deployment, so we clear whatever Ory identity cookie the browser actually
// sent, scoped the same way it was issued: parent-domain on Ory Network (how the
// @ory/nextjs proxy sets it, e.g. `.e2b-staging.dev`), host-only otherwise.
export function clearAppSessionCookies(
  request: NextRequest,
  response: NextResponse
): void {
  for (const name of sessionCookieNames(request.cookies.getAll())) {
    response.cookies.delete(
      sessionCookieDeleteOptions(request.nextUrl.host, name)
    )
  }

  const domain = resolveSessionCookieDomain(request.nextUrl.host)
  for (const { name } of request.cookies.getAll()) {
    if (!ORY_IDENTITY_SESSION_COOKIE.test(name)) continue
    response.cookies.delete(
      domain ? { name, path: '/', domain } : { name, path: '/' }
    )
  }
}
