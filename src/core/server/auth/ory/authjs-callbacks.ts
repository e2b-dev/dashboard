import 'server-only'

import { cookies } from 'next/headers'
import type { Account, Profile, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { ensureOryUserBootstrapped } from './dashboard-bootstrap'
import { resolveOryIdentity } from './find-identity'
import { decodeJwtClaims, readStringClaim } from './jwt-claims'
import { refreshOryToken } from './refresh-token'
import {
  ORY_BOOTSTRAP_FAILURE_FLOW_PATH,
  ORY_BOOTSTRAP_FAILURE_ID_TOKEN_COOKIE,
} from './signout'

// Refresh the access token slightly before it actually expires so we never hand
// a token that dies mid-request to downstream APIs.
const ACCESS_TOKEN_REFRESH_SKEW_SECONDS = 60

const BOOTSTRAP_FAILURE_COOKIE_MAX_AGE_SECONDS = 60

// Implements the Auth.js `signIn` callback. This is intentionally a callback,
// not an event: returning a URL here denies the sign-in before Auth.js finalizes
// the new session cookie. On failure, we hand the id_token to a local route via
// a short-lived httpOnly cookie so that route can perform Ory RP-initiated
// logout in the browser.
export async function allowOrySignIn(params: {
  account?: Account | null
  profile?: Profile
}): Promise<boolean | string> {
  const { account } = params

  if (!account?.access_token) {
    l.error(
      {
        key: 'auth_callbacks:sign_in:missing_access_token',
        context: { provider: account?.provider ?? null },
      },
      'Ory sign-in missing access token; denying sign-in'
    )
    return prepareBootstrapFailureRedirect(account)
  }

  const bootstrapped = await ensureOryUserBootstrapped({
    accessToken: account.access_token,
    idToken: account.id_token,
    provider: account.provider,
  })

  if (bootstrapped) return true

  l.error(
    {
      key: 'auth_callbacks:sign_in:bootstrap_failed',
      context: { provider: account.provider },
    },
    'Ory user bootstrap could not be confirmed; denying sign-in'
  )
  return prepareBootstrapFailureRedirect(account)
}

// Implements the Auth.js `jwt` callback: mint the token on fresh sign-in,
// otherwise refresh it as it nears expiry.
export async function resolveOryJwt(params: {
  token: JWT
  account?: Account | null
  profile?: Profile
}): Promise<JWT> {
  const { token, account, profile } = params

  if (account) {
    return buildSignInToken(token, account, profile)
  }

  // Once a refresh has failed we stop retrying. The dead token (cleared
  // access/refresh) propagates to the session, oryAuthProvider returns null,
  // and the proxy redirects to /sign-in.
  if (token.error) {
    return token
  }

  if (isAccessTokenExpiring(token)) {
    return refreshOryToken(token)
  }

  return token
}

// Implements the Auth.js `session` callback: project the persisted token fields
// onto the session the rest of the app reads.
export function applyTokenToSession(session: Session, token: JWT): Session {
  session.user.id = token.sub ?? session.user.id
  session.accessToken = token.accessToken
  session.idToken = token.idToken
  session.identityId = token.identityId
  session.error = token.error
  return session
}

// Persist the Ory tokens on a fresh sign-in and cache the resolved Kratos
// identity id. Clears any RefreshTokenError carried over from a previously
// poisoned cookie so the new session starts clean.
async function buildSignInToken(
  token: JWT,
  account: Account,
  profile?: Profile
): Promise<JWT> {
  return {
    ...token,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    idToken: account.id_token,
    expiresAt: account.expires_at ?? null,
    identityId: await resolveKratosIdentityId(token, account, profile),
    error: undefined,
  }
}

// The Kratos identity id is NOT the OIDC subject the dashboard uses as the E2B
// user id (`token.sub`, consumed by dashboard-api and infra). It is surfaced via
// the OIDC profile `sub`. Resolve it once at sign-in — by profile.sub, then
// token.sub, then the verified email — so account operations can use a stable
// Kratos id without a per-request lookup. Returns undefined on failure; the
// provider then falls back to a per-request lookup, so sign-in is never blocked.
async function resolveKratosIdentityId(
  token: JWT,
  account: Account,
  profile?: Profile
): Promise<string | undefined> {
  const profileSub = typeof profile?.sub === 'string' ? profile.sub : undefined

  const identity = await resolveOryIdentity({
    subjects: [profileSub, token.sub],
    email: readEmailClaim(account),
  })

  return identity?.id
}

function readEmailClaim(account: Account): string | undefined {
  for (const jwt of [account.id_token, account.access_token]) {
    if (typeof jwt !== 'string') continue
    const email = readStringClaim(decodeJwtClaims(jwt), 'email')
    if (email) return email
  }
  return undefined
}

async function prepareBootstrapFailureRedirect(
  account?: Account | null
): Promise<string> {
  if (!account?.id_token) return ORY_BOOTSTRAP_FAILURE_FLOW_PATH

  try {
    const cookieStore = await cookies()
    cookieStore.set(ORY_BOOTSTRAP_FAILURE_ID_TOKEN_COOKIE, account.id_token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: BOOTSTRAP_FAILURE_COOKIE_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === 'production',
    })
  } catch (error) {
    l.warn(
      {
        key: 'auth_callbacks:sign_in:bootstrap_failure_cookie_error',
        error: serializeErrorForLog(error),
      },
      'Failed to persist Ory bootstrap-failure logout handoff cookie'
    )
  }

  return ORY_BOOTSTRAP_FAILURE_FLOW_PATH
}

function isAccessTokenExpiring(
  token: JWT,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (token.expiresAt == null) return false
  return nowSeconds > token.expiresAt - ACCESS_TOKEN_REFRESH_SKEW_SECONDS
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    idToken?: string
    // Kratos identity id, resolved from the OIDC subject at sign-in. Differs
    // from user.id (the OIDC subject / E2B user id) when the project customizes
    // the OAuth2 subject.
    identityId?: string
    error?: string
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    identityId?: string
    expiresAt?: number | null
    error?: string
  }
}
