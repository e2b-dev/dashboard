import 'server-only'

import type { Session } from '@ory/client-fetch'
import { getLogoutFlow, getServerSession } from '@ory/nextjs/app'
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
import { getBackendToken } from './backend-token'
import {
  ACCOUNT_IDENTITY_CREDENTIALS,
  resolveOryIdentity,
} from './find-identity'
import { oryAuthFlows } from './flows'
import { fromOryIdentity } from './identity'
import { revokeKratosSessionsForIdentity } from './kratos-session'

// Where the account-settings page expects to land after a forced re-auth so it
// reveals the password form (matches the existing ?reauth=1 contract).
const ACCOUNT_SETTINGS_REAUTH_RETURN_TO = `${PROTECTED_URLS.ACCOUNT_SETTINGS}?reauth=1`

// How recently the Kratos session must have authenticated for a sensitive
// operation (password / email change) to proceed without a forced re-auth.
const REAUTH_FRESHNESS_WINDOW_SECONDS = 300

export async function getAuthContext(): Promise<AuthContext | null> {
  // Re-validate the live Kratos session before trusting (or caching) anything.
  const session = await readSession()
  const identityId = session?.identity?.id
  if (!session?.active || !identityId || !session.id) return null

  // The backend validates a Hydra JWT; mint one from the session (cached).
  const traits = readTraits(session)
  const accessToken = await getBackendToken({
    sessionId: session.id,
    subject: identityId,
    email: traits.email,
    name: traits.name,
  })
  if (!accessToken) {
    l.warn(
      {
        key: 'auth_provider:ory_silent_grant_unavailable',
        user_id: identityId,
      },
      'Kratos session present but backend token mint failed; treating as unauthenticated'
    )
    return null
  }

  return {
    user: session.identity
      ? fromOryIdentity(session.identity, { userId: identityId })
      : fallbackUser(identityId, traits),
    accessToken,
  } satisfies AuthContext
}

export async function getUserProfile(): Promise<AuthUser | null> {
  const session = await readSession()
  const identityId = session?.identity?.id
  if (!identityId) return null

  const traits = readTraits(session)
  // The live profile needs the full Kratos identity (traits + credentials).
  const identity = await resolveOryIdentity({
    subjects: [identityId],
    email: traits.email,
    includeCredential: ACCOUNT_IDENTITY_CREDENTIALS,
  })

  return identity
    ? fromOryIdentity(identity, { userId: identityId })
    : session.identity
      ? fromOryIdentity(session.identity, { userId: identityId })
      : null
}

export async function signOut(
  options?: SignOutOptions
): Promise<SignOutResult> {
  try {
    // Kratos self-service logout. The returned logout_url is same-origin
    // (proxied), so the caller can hard-navigate to it to clear the session.
    const flow = await getLogoutFlow({ returnTo: options?.returnTo })
    return { redirectTo: flow.logout_url }
  } catch (error) {
    l.warn(
      {
        key: 'auth_provider:ory_logout_flow:error',
        error: serializeErrorForLog(error),
      },
      'failed to create Kratos logout flow; falling back to home'
    )
    return { redirectTo: options?.returnTo ?? '/' }
  }
}

export async function updateUser(
  input: UpdateUserInput
): Promise<UpdateUserResult> {
  const session = await readSession()
  const identityId = session?.identity?.id
  if (!identityId) {
    throw new Error('updateUser called without an authenticated Ory session')
  }

  // Changing the password OR the email is privileged: require a recently
  // authenticated Kratos session so a stolen dashboard session can't silently
  // take over the account. The caller turns this into a forced re-auth.
  const changesCredentials =
    input.password !== undefined || input.email !== undefined
  if (changesCredentials && !isSessionFresh(session)) {
    return { ok: false, code: 'reauthentication_needed' }
  }

  const result = await oryAuthFlows.updateUser({
    identityId,
    name: input.name,
    email: input.email,
    password: input.password,
  })

  if (!result.ok) return result

  return { ...result, user: { ...result.user, id: identityId } }
}

export async function startReauthForAccountSettings(): Promise<ReauthDispatch> {
  // Same-origin Kratos login flow with refresh=true re-authenticates the
  // existing session, then returns to the account settings reauth contract.
  const returnTo = encodeURIComponent(ACCOUNT_SETTINGS_REAUTH_RETURN_TO)
  return {
    to: `/login?refresh=true&return_to=${returnTo}`,
  }
}

export async function handleCredentialChangeSuccess(): Promise<void> {
  const session = await readSession()
  const identityId = session?.identity?.id
  if (identityId) {
    await revokeKratosSessionsForIdentity(identityId)
  }
}

type SessionTraits = { email?: string; name?: string }

function readTraits(session: Session | null): SessionTraits {
  const traits = (session?.identity?.traits ?? {}) as Record<string, unknown>
  const email = typeof traits.email === 'string' ? traits.email : undefined
  const name =
    typeof traits.name === 'string'
      ? traits.name
      : isNameObject(traits.name)
        ? [traits.name.first, traits.name.last].filter(Boolean).join(' ') ||
          undefined
        : undefined
  return { email, name }
}

function isNameObject(
  value: unknown
): value is { first?: string; last?: string } {
  return typeof value === 'object' && value !== null
}

function fallbackUser(id: string, traits: SessionTraits): AuthUser {
  return {
    id,
    email: traits.email ?? null,
    name: traits.name ?? null,
    avatarUrl: null,
    providers: [],
    canChangeEmail: false,
    canChangePassword: false,
  }
}

// Kratos stamps `authenticated_at` with the last active authentication; this is
// what `?refresh=true` on the login flow updates. Mirrors the OAuth id_token
// `auth_time` freshness check the OAuth flow used.
function isSessionFresh(
  session: Session | null,
  nowMs: number = Date.now()
): boolean {
  const authenticatedAt = session?.authenticated_at
  if (!authenticatedAt) return false
  const authedMs = new Date(authenticatedAt).getTime()
  if (Number.isNaN(authedMs)) return false
  return (nowMs - authedMs) / 1000 <= REAUTH_FRESHNESS_WINDOW_SECONDS
}

const readSession = cache(async (): Promise<Session | null> => {
  try {
    return await getServerSession()
  } catch (error) {
    l.error(
      {
        key: 'auth_provider:ory_get_session:error',
        error: serializeErrorForLog(error),
      },
      'getServerSession() threw while reading the Kratos session'
    )
    return null
  }
})
