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
import type { OryInternalAuthJsSession } from './authjs-session-boundary'
import { ensureOryUserBootstrapped } from './dashboard-bootstrap'
import { resolveOryIdentity } from './find-identity'
import { refreshOryToken } from './refresh-token'
import {
  ORY_BOOTSTRAP_FAILURE_FLOW_PATH,
  ORY_BOOTSTRAP_FAILURE_ID_TOKEN_COOKIE,
} from './signout'
import { persistOrySignupMetadataFromCookie } from './signup-metadata'

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
 *   Projects token fields onto the Session object consumed by Auth.js's
 *   server-side auth() helper. The public /session route strips those fields
 *   before responding to browsers.
 */

// Refresh the access token slightly before it actually expires so we never hand
// a token that dies mid-request to downstream APIs.
const ACCESS_TOKEN_REFRESH_SKEW_SECONDS = 60

const BOOTSTRAP_FAILURE_COOKIE_MAX_AGE_SECONDS = 60

// external_id is read from the Kratos identity at sign-in (after bootstrap), so
// it is normally already on the token. This caps the per-request Kratos
// re-resolution used to backfill sessions that predate the externalId field.
const MAX_EXTERNAL_ID_RESOLVE_ATTEMPTS = 1

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
  // access/refresh) propagates to the session, getAuthContext returns null,
  // and the proxy redirects to /sign-in.
  if (token.error) {
    return token
  }

  let next = token
  if (isAccessTokenExpiring(next)) {
    next = await refreshOryToken(next)
    if (next.error) return next
  }

  // Resolve external_id on the same tick as a refresh so a legacy session is
  // never left half-authenticated for a request.
  if (shouldResolveExternalId(next)) {
    next = await resolveExternalIdFromKratos(next)
  }

  return next
}

// True when external_id is still missing but we have a subject to look it up
// against and remaining budget. Normally external_id is already on the token
// from sign-in; this backfills sessions that predate the field.
function shouldResolveExternalId(token: OryAuthJsJwt): boolean {
  return (
    !token.externalId &&
    !!(token.identityId ?? token.sub) &&
    (token.externalIdResolveAttempts ?? 0) < MAX_EXTERNAL_ID_RESOLVE_ATTEMPTS
  )
}

// Hydra does not project external_id into the access token, so we re-read it
// from the Kratos identity rather than refreshing the OAuth token. The Kratos
// id may be stored as identityId or, on older tokens, only as the sub.
async function resolveExternalIdFromKratos(
  token: OryAuthJsJwt
): Promise<OryAuthJsJwt> {
  const identity = await resolveOryIdentity({
    subjects: [token.identityId, token.sub],
  })

  if (identity?.external_id) {
    return { ...token, externalId: identity.external_id }
  }

  // Only spend budget on a definitive outcome (identity resolved but has no
  // external_id). A null identity is likely a transient Kratos failure
  // (find-identity swallows non-404s), so leave the budget to retry next tick.
  return {
    ...token,
    externalIdResolveAttempts: identity
      ? (token.externalIdResolveAttempts ?? 0) + 1
      : (token.externalIdResolveAttempts ?? 0),
  }
}

// Implements the Auth.js `session` callback: project the persisted token fields
// onto the session the rest of the app reads.
export function projectOryJwtToAuthJsSession({
  session,
  token,
}: OryAuthJsSessionInput) {
  const orySession = session as OryInternalAuthJsSession
  // AuthUser.id is the public.users.id (external_id). token.sub stays the
  // Kratos identity id, surfaced as identityId for admin/OAuth operations.
  orySession.user.id = token.externalId ?? token.sub ?? orySession.user.id
  orySession.accessToken = token.accessToken
  orySession.idToken = token.idToken
  orySession.identityId = token.identityId ?? token.sub
  orySession.externalId = token.externalId
  orySession.error = token.error
  return orySession
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
  const { identityId, externalId } = await resolveKratosIdentity(
    nextToken,
    account,
    profile
  )

  await persistOrySignupMetadataFromCookie(identityId)

  return {
    ...nextToken,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    idToken: account.id_token,
    expiresAt: account.expires_at ?? null,
    identityId,
    externalId,
    externalIdResolveAttempts: 0,
    error: undefined,
  }
}

// Resolve the Kratos identity once at sign-in — by profile.sub, then token.sub,
// then the verified email. We read two things off it:
//   - `id`: the Kratos identity id (the OAuth2 subject), used for admin and
//     Hydra operations without a per-request lookup.
//   - `external_id`: the dashboard public.users.id. Hydra does not project this
//     into the OAuth2 access token, so the Kratos identity is the source of
//     truth. Bootstrap (in the signIn callback) sets it before this runs, so it
//     is present even for brand-new users. Returns undefined on failure; the
//     provider falls back to per-request lookups, so sign-in is never blocked.
async function resolveKratosIdentity(
  token: OryAuthJsJwt,
  account: OryAuthJsAccount,
  profile: OryAuthJsJwtInput['profile']
): Promise<{ identityId?: string; externalId?: string }> {
  const identity = await resolveOryIdentity({
    subjects: [readOryProfileSubject(profile), token.sub],
    email: readOryEmailClaim(account),
  })

  return { identityId: identity?.id, externalId: identity?.external_id }
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
  if (token.expiresAt == null) return !!token.refreshToken
  return nowSeconds > token.expiresAt - ACCESS_TOKEN_REFRESH_SKEW_SECONDS
}
