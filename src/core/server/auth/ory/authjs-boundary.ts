import 'server-only'

import type { Account, Profile, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { decodeJwtClaims, readStringClaim } from './jwt-claims'

/**
 * Auth.js uses OAuth/OIDC-generic names. In this adapter those names mean:
 *
 * - `account`: Ory OAuth2 token endpoint response. This is where Auth.js gives
 *   us the Ory access/id/refresh tokens.
 * - `profile`: OIDC profile claims decoded by Auth.js from the id_token and/or
 *   userinfo response.
 * - `user`: Auth.js's synthetic user derived from the OIDC profile. It is not
 *   the dashboard AuthUser and not the Kratos Identity.
 * - `token`: Auth.js encrypted JWT session-cookie payload. We persist selected
 *   Ory token fields there, then project them onto `session`.
 */

export type OryAuthJsAccount = Account & {
  provider: 'ory'
  type: 'oidc'
  access_token: string
  id_token?: string
  refresh_token?: string
  expires_at?: number
}

export type OryAuthJsProfile = Profile & {
  // OIDC subject from id_token/userinfo. In our Ory project this may be the
  // Kratos identity id, while Auth.js `token.sub` is the dashboard/E2B user id.
  sub?: string | null
  email?: string | null
  name?: string | null
}

export type OryAuthJsJwt = JWT & {
  // Ory access token forwarded to dashboard-api/infra.
  accessToken?: string
  // Ory refresh token used by refreshOryToken.
  refreshToken?: string
  // Ory ID token used for re-auth freshness and RP-initiated logout.
  idToken?: string
  // Kratos identity id resolved at sign-in for admin IdentityApi operations.
  identityId?: string
  // Auth.js absolute expiration timestamp, in seconds.
  expiresAt?: number | null
  error?: string
}

export type OryAuthJsSignInInput = {
  account?: Account | null
}

export type OryAuthJsJwtInput = {
  token: OryAuthJsJwt
  account?: Account | null
  profile?: OryAuthJsProfile
}

export type OryAuthJsSessionInput = {
  session: Session
  token: OryAuthJsJwt
}

export function readOryAuthJsAccount(
  account?: Account | null
): OryAuthJsAccount | null {
  if (
    account?.provider !== 'ory' ||
    account.type !== 'oidc' ||
    typeof account.access_token !== 'string' ||
    account.access_token.length === 0
  ) {
    return null
  }

  return account as OryAuthJsAccount
}

export function readOryProfileSubject(
  profile?: OryAuthJsProfile
): string | undefined {
  const subject = profile?.sub
  return typeof subject === 'string' && subject.length > 0 ? subject : undefined
}

export function readOryAccessTokenSubject(
  account: OryAuthJsAccount
): string | undefined {
  return readStringClaim(decodeJwtClaims(account.access_token), 'sub')
}

export function readOryEmailClaim(
  account: OryAuthJsAccount
): string | undefined {
  for (const jwt of [account.id_token, account.access_token]) {
    if (typeof jwt !== 'string') continue
    const email = readStringClaim(decodeJwtClaims(jwt), 'email')
    if (email) return email
  }
  return undefined
}
