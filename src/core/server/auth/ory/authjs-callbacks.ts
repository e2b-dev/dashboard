import 'server-only'

import { cookies } from 'next/headers'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import {
  type OryAuthJsAccount,
  type OryAuthJsJwt,
  type OryAuthJsJwtInput,
  type OryAuthJsSessionInput,
  type OryAuthJsSignInInput,
  readOryAccessTokenSubject,
  readOryAuthJsAccount,
  readOryEmailClaim,
  readOryProfileSubject,
} from './authjs-boundary'
import { ensureOryUserBootstrapped } from './dashboard-bootstrap'
import { resolveOryIdentity } from './find-identity'
import { refreshOryToken } from './refresh-token'
import {
  ORY_BOOTSTRAP_FAILURE_FLOW_PATH,
  ORY_BOOTSTRAP_FAILURE_ID_TOKEN_COOKIE,
} from './signout'

/**
 * Auth.js <-> Ory data flow:
 *
 * signIn callback:
 *   `account` is the OAuth token endpoint response (access/id/refresh tokens).
 *   `profile` is OIDC claims from the id_token/userinfo response.
 *   `user` is Auth.js's synthetic profile user, not our AuthUser/Kratos Identity.
 *
 * jwt callback:
 *   Persists selected Ory token fields into Auth.js's encrypted JWT cookie.
 *
 * session callback:
 *   Projects those fields from the JWT cookie onto the Session object consumed
 *   by our AuthProvider. Live Kratos traits/credentials are fetched separately
 *   through getUserProfile().
 */

// Refresh the access token slightly before it actually expires so we never hand
// a token that dies mid-request to downstream APIs.
const ACCESS_TOKEN_REFRESH_SKEW_SECONDS = 60

const BOOTSTRAP_FAILURE_COOKIE_MAX_AGE_SECONDS = 60

// Implements the Auth.js `signIn` callback. This is intentionally a callback,
// not an event: returning a URL here denies the sign-in before Auth.js finalizes
// the new session cookie. On failure, we hand the id_token to a local route via
// a short-lived httpOnly cookie so that route can perform Ory RP-initiated
// logout in the browser.
export async function handleOryAuthJsSignIn(
  params: OryAuthJsSignInInput
): Promise<boolean | string> {
  const account = readOryAuthJsAccount(params.account)

  if (!account) {
    l.error(
      {
        key: 'auth_callbacks:sign_in:missing_access_token',
        context: { provider: params.account?.provider ?? null },
      },
      'Ory sign-in missing access token; denying sign-in'
    )
    return prepareBootstrapFailureRedirect(params.account)
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
export async function persistOryTokensInAuthJsJwt(
  params: OryAuthJsJwtInput
): Promise<OryAuthJsJwt> {
  const { token, account, profile } = params

  if (account) {
    const oryAccount = readOryAuthJsAccount(account)
    if (!oryAccount) {
      return { ...token, error: 'InvalidOryAccount' }
    }

    return buildSignInToken(token, oryAccount, profile)
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
export function projectOryJwtToAuthJsSession({
  session,
  token,
}: OryAuthJsSessionInput) {
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
  token: OryAuthJsJwt,
  account: OryAuthJsAccount,
  profile: OryAuthJsJwtInput['profile']
): Promise<OryAuthJsJwt> {
  const userId = readOryAccessTokenSubject(account) ?? token.sub
  const nextToken = {
    ...token,
    sub: userId,
  }

  return {
    ...nextToken,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    idToken: account.id_token,
    expiresAt: account.expires_at ?? null,
    identityId: await resolveKratosIdentityId(nextToken, account, profile),
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
  token: OryAuthJsJwt,
  account: OryAuthJsAccount,
  profile: OryAuthJsJwtInput['profile']
): Promise<string | undefined> {
  const identity = await resolveOryIdentity({
    subjects: [readOryProfileSubject(profile), token.sub],
    email: readOryEmailClaim(account),
  })

  return identity?.id
}

async function prepareBootstrapFailureRedirect(
  account?: { id_token?: string } | null
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
  token: OryAuthJsJwt,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (token.expiresAt == null) return false
  return nowSeconds > token.expiresAt - ACCESS_TOKEN_REFRESH_SKEW_SECONDS
}
