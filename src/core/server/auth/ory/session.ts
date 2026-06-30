import 'server-only'

import { getServerSession } from '@ory/nextjs/app'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import type {
  AuthContext,
  AuthUser,
  ReauthDispatch,
  SignOutOptions,
  SignOutResult,
  UpdateUserInput,
  UpdateUserResult,
} from '../types'
import { buildOryStartURL } from './build-start-url'
import {
  ACCOUNT_IDENTITY_CREDENTIALS,
  resolveOryIdentity,
} from './find-identity'
import { oryAuthFlows } from './flows'
import { isKratosSessionFresh } from './freshness'
import {
  fromKratosSessionIdentity,
  fromOryIdentity,
  readIdentityDisplayProfile,
} from './identity'
import {
  disableOtherKratosSessions,
  revokeKratosSession,
  revokeKratosSessionsForIdentity,
} from './kratos-session'
import { revokeOryOAuthSessionsForSubject } from './oauth-session'
import {
  cookieHeaderWithoutAppOwned,
  E2B_SESSION_COOKIE,
  openSessionCookie,
  sessionCookieDeleteOptions,
} from './session-cookie'
import { completeOrySignOut } from './signout-flow'
import { revokeSessionTokens } from './token-revoke'

const ACCOUNT_SETTINGS_REAUTH_RETURN_TO = `${PROTECTED_URLS.ACCOUNT_SETTINGS}?reauth=1`

// Kratos owns the session. Identity (the gate) comes from `whoami`; the Hydra
// access token (API access only) comes from the e2b_session cookie, which the
// middleware keeps fresh. For E2B the OAuth subject equals the Kratos identity
// id, so kratos.identity.id is both the dashboard user id and the Kratos id used
// for admin operations. This module never refreshes — it is a pure reader.

export async function getAuthContext(): Promise<AuthContext | null> {
  const kratos = await readKratosSession()
  if (!kratos?.active || !kratos.identity) return null

  // public.users.id lives only on the Kratos identity's external_id. Without it
  // the dashboard can't key the user to its own records (PostHog, telemetry,
  // team membership), so we refuse the half-provisioned session. The edge gate
  // (isKratosSessionActive) rejects it too, so the user is routed to /sign-in
  // where a fresh login re-runs bootstrap and backfills external_id.
  if (!kratos.identity.external_id) {
    l.error(
      {
        key: 'auth_provider:identity_missing_external_id',
        context: { identity_id: kratos.identity.id },
      },
      'Kratos identity has no external_id; treating the session as unauthenticated'
    )
    return null
  }

  const tokens = await readSessionTokens()
  if (!tokens?.accessToken) return null

  return {
    user: fromKratosSessionIdentity(kratos.identity),
    accessToken: tokens.accessToken,
  }
}

// external_id is set by bootstrap and lives only on the Kratos identity (never in
// the token claims). A non-null value means the user is already provisioned, so
// the OAuth callback can skip the bootstrap admin call. Reuses the request-cached
// session read — no extra whoami round trip.
export async function readKratosExternalId(): Promise<string | null> {
  const kratos = await readKratosSession()
  return kratos?.active ? (kratos.identity?.external_id ?? null) : null
}

export async function getUserProfile(): Promise<AuthUser | null> {
  const identityId = (await readKratosSession())?.identity?.id
  if (!identityId) return null

  // The rich profile needs the full identity (traits + credentials).
  const identity = await resolveOryIdentity({
    subjects: [identityId],
    includeCredential: ACCOUNT_IDENTITY_CREDENTIALS,
  })

  return identity ? fromOryIdentity(identity) : null
}

// Display-only profile for the pre-provisioning /settings page. Unlike
// getUserProfile (which requires a fully provisioned identity), this reads
// name/email straight off the Kratos session, so it works for a recovery
// session whose identity has no external_id yet.
export async function getSettingsProfile(): Promise<Pick<
  AuthUser,
  'name' | 'email'
> | null> {
  const identity = (await readKratosSession())?.identity
  if (!identity) return null
  return readIdentityDisplayProfile(identity)
}

// Tears down the current login: revokes the OAuth tokens and the Kratos
// identity session for this device. Hydra's RP-initiated logout only runs the
// /logout -> Kratos bridge when Hydra still holds an active authentication
// session; in production the login is accepted with remember=false, so Hydra
// short-circuits and the bridge never fires — leaving both the refresh token
// and the Kratos session alive (the latter surfaces "Reauthenticate as <last
// user>"). Revoking here makes teardown deterministic across environments
// without signing the user out of their other devices.
export async function revokeCurrentSession(): Promise<void> {
  const tokens = await openSessionCookie(
    (await cookies()).get(E2B_SESSION_COOKIE)?.value
  )
  if (tokens) {
    await revokeSessionTokens(tokens)
  }

  const sessionId = (await readKratosSession())?.id
  if (sessionId) {
    await revokeKratosSession(sessionId)
  }
}

export async function signOut(
  options?: SignOutOptions
): Promise<SignOutResult> {
  await revokeCurrentSession()

  return {
    redirectTo: await completeOrySignOut(options?.origin, options?.returnTo),
  }
}

export async function updateUser(
  input: UpdateUserInput
): Promise<UpdateUserResult> {
  const kratos = await readKratosSession()
  const identityId = kratos?.identity?.id
  if (!identityId) {
    throw new Error('updateUser called without an authenticated Kratos session')
  }

  // Changing the password OR the email is privileged: the dashboard mutates
  // credentials via the admin API, which bypasses Kratos's own privileged-
  // session enforcement, so we mirror the freshness window here.
  const changesCredentials =
    input.password !== undefined || input.email !== undefined
  if (changesCredentials && !isKratosSessionFresh(kratos?.authenticated_at)) {
    return { ok: false, code: 'reauthentication_needed' }
  }

  const result = await oryAuthFlows.updateUser({
    identityId,
    name: input.name,
    email: input.email,
    password: input.password,
  })

  return result
}

export async function startReauthForAccountSettings(): Promise<ReauthDispatch> {
  return {
    to: buildOryStartURL('reauth', ACCOUNT_SETTINGS_REAUTH_RETURN_TO),
  }
}

export async function isCurrentSessionFresh(): Promise<boolean> {
  const kratos = await readKratosSession()
  return isKratosSessionFresh(kratos?.authenticated_at)
}

export async function handleInSessionPasswordChange(): Promise<void> {
  const cookie = cookieHeaderWithoutAppOwned((await cookies()).getAll())
  if (!cookie) return

  await disableOtherKratosSessions(cookie)
}

export async function handleCredentialChangeSuccess(): Promise<void> {
  const identityId = (await readKratosSession())?.identity?.id
  if (!identityId) return

  await Promise.all([
    revokeOryOAuthSessionsForSubject(identityId),
    revokeKratosSessionsForIdentity(identityId),
  ])

  await clearSessionCookie()
}

// Live Kratos session (whoami), memoized per request. The authority for "is
// authenticated"; the e2b_session cookie only carries the API token.
const readKratosSession = cache(async () => {
  try {
    return await getServerSession()
  } catch (error) {
    l.error(
      {
        key: 'auth_provider:kratos_get_session:error',
        error: serializeErrorForLog(error),
      },
      'getServerSession() threw while reading the Kratos session'
    )
    return null
  }
})

const readSessionTokens = cache(async () => {
  const cookieStore = await cookies()
  return openSessionCookie(cookieStore.get(E2B_SESSION_COOKIE)?.value)
})

async function clearSessionCookie(): Promise<void> {
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
    cookieStore.delete(sessionCookieDeleteOptions(headerStore.get('host')))
  } catch (error) {
    l.warn(
      {
        key: 'auth_provider:clear_session_cookie:error',
        error: serializeErrorForLog(error),
      },
      'failed to clear the e2b_session cookie after credential change'
    )
  }
}
