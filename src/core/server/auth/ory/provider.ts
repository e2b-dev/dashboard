import 'server-only'

import type { Session } from '@ory/client-fetch'
import { getLogoutFlow, getServerSession } from '@ory/nextjs/app'
import { PROTECTED_URLS } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import type { AuthProvider } from '../provider'
import type {
  AuthContext,
  AuthUser,
  ReauthDispatch,
  UpdateUserInput,
  UpdateUserResult,
} from '../types'
import {
  ACCOUNT_IDENTITY_CREDENTIALS,
  resolveOryIdentity,
} from './find-identity'
import { oryAuthFlows } from './flows'
import { fromOryIdentity } from './identity'
import { revokeKratosSessionsForIdentity } from './kratos-session'
import { mintBackendToken } from './silent-grant'

// Where the account-settings page expects to land after a forced re-auth so it
// reveals the password form (matches the Supabase ?reauth=1 contract).
const ACCOUNT_SETTINGS_REAUTH_RETURN_TO = `${PROTECTED_URLS.ACCOUNT_SETTINGS}?reauth=1`

// How recently the Kratos session must have authenticated for a sensitive
// operation (password / email change) to proceed without a forced re-auth.
const REAUTH_FRESHNESS_WINDOW_SECONDS = 300

export const oryAuthProvider: AuthProvider = {
  async getAuthContext() {
    const session = await readSession()
    const identityId = session?.identity?.id
    if (!session?.active || !identityId) return null

    // The backend still validates a Hydra JWT, so mint one from the Kratos
    // session (server-side, no redirect). No token → can't call the backend,
    // so treat as unauthenticated.
    const traits = readTraits(session)
    const token = await mintBackendToken({
      subject: identityId,
      email: traits.email,
      name: traits.name,
    })
    if (!token) {
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
        ? fromOryIdentity(session.identity)
        : fallbackUser(identityId, traits),
      accessToken: token.accessToken,
    } satisfies AuthContext
  },

  async getUserProfile(): Promise<AuthUser | null> {
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
      : session?.identity
        ? fromOryIdentity(session.identity, { userId: identityId })
        : null
  },

  async signOut(options) {
    try {
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
  },

  async updateUser(input: UpdateUserInput): Promise<UpdateUserResult> {
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
  },

  async startReauthForAccountSettings(): Promise<ReauthDispatch> {
    // Same-origin Kratos login flow with refresh=true re-authenticates the
    // existing session, then returns to the account settings reauth contract.
    const returnTo = encodeURIComponent(ACCOUNT_SETTINGS_REAUTH_RETURN_TO)
    return {
      kind: 'redirect',
      to: `/login?refresh=true&return_to=${returnTo}`,
    }
  },

  async handleCredentialChangeSuccess(): Promise<void> {
    const session = await readSession()
    const identityId = session?.identity?.id
    if (identityId) {
      await revokeKratosSessionsForIdentity(identityId)
    }
  },
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

async function readSession(): Promise<Session | null> {
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
}
