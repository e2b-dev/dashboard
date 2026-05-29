import 'server-only'

import type { Identity, IdentityCredentials } from '@ory/client-fetch'
import type { Session } from 'next-auth'
import { auth as authjs } from '@/auth'
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
import { buildOryStartURL } from './build-start-url'
import {
  type OryIdentityCredentialInclude,
  resolveOryIdentity,
} from './find-identity'
import { oryAuthFlows } from './flows'
import { isReauthFresh } from './freshness'
import { fromAuthSession, fromOryIdentity } from './identity'
import { revokeKratosSessionsForIdentity } from './kratos-session'
import { ORY_SIGN_OUT_FLOW_PATH } from './signout'

// Where the account-settings page expects to land after a forced re-auth so it
// reveals the password form (matches the Supabase ?reauth=1 contract).
const ACCOUNT_SETTINGS_REAUTH_RETURN_TO = `${PROTECTED_URLS.ACCOUNT_SETTINGS}?reauth=1`
const PROFILE_IDENTITY_CREDENTIALS = [
  'password',
  'oidc',
] satisfies OryIdentityCredentialInclude[]

export const oryAuthProvider: AuthProvider = {
  async getAuthContext() {
    const session = await readSession()
    if (!session) return null

    if (!session.user?.id || !session.accessToken) {
      return null
    }

    if (session.error) {
      l.warn(
        {
          key: 'auth_provider:ory_session_error',
          user_id: session.user.id,
          context: { error: session.error },
        },
        `Auth.js session reports error '${session.error}'; treating as unauthenticated`
      )
      return null
    }

    return {
      user: fromAuthSession(session),
      accessToken: session.accessToken,
    } satisfies AuthContext
  },

  async getUserProfile(): Promise<AuthUser | null> {
    const session = await readSession()
    if (!session?.user?.id) return null

    // The live profile needs the full Kratos identity (traits + credentials).
    // The cached session.identityId hits directly; user.id and email are
    // fallbacks. Callers (the tRPC profile query) time this out and fall back to
    // the cheap session user, so a null/slow response never blocks the dashboard.
    const identity = await resolveOryIdentity({
      subjects: [session.identityId, session.user.id],
      email: session.user.email,
      includeCredential: PROFILE_IDENTITY_CREDENTIALS,
    })

    l.debug(
      {
        key: 'auth_provider:ory_get_user_profile:identity',
        user_id: session.user.id,
        context: {
          session_identity_id: session.identityId ?? null,
          session_user_email: session.user.email ?? null,
          identity: identity ? summarizeIdentityForLog(identity) : null,
        },
      },
      'resolved Ory identity for dashboard user profile'
    )

    return identity ? fromOryIdentity(identity) : null
  },

  signOut() {
    return Promise.resolve({ redirectTo: ORY_SIGN_OUT_FLOW_PATH })
  },

  async updateUser(input: UpdateUserInput): Promise<UpdateUserResult> {
    const session = await readSession()
    if (!session?.user?.id) {
      throw new Error('updateUser called without an authenticated Ory session')
    }

    // Changing the password OR the email is privileged: require a recent active
    // login so a stolen dashboard session can't silently take over the account
    // (swap the email, then reset the password via the new inbox). The caller
    // turns this into the forced OAuth2 re-auth round-trip.
    const changesCredentials =
      input.password !== undefined || input.email !== undefined
    if (changesCredentials && !isReauthFresh(session.idToken)) {
      return { ok: false, code: 'reauthentication_needed' }
    }

    const identityId = await resolveIdentityId(session)
    if (!identityId) {
      throw new Error(
        'updateUser could not resolve an Ory identity for the session subject'
      )
    }

    return oryAuthFlows.updateUser({
      identityId,
      name: input.name,
      email: input.email,
      password: input.password,
    })
  },

  async startReauthForAccountSettings(): Promise<ReauthDispatch> {
    return {
      kind: 'redirect',
      to: buildOryStartURL('reauth', ACCOUNT_SETTINGS_REAUTH_RETURN_TO),
    }
  },

  async signOutOtherSessions(): Promise<void> {
    const session = await readSession()
    if (!session?.user?.id) return

    const identityId = await resolveIdentityId(session)
    if (!identityId) return

    // The dashboard session is the Auth.js JWT, independent of Kratos identity
    // sessions, so revoking all Kratos sessions invalidates other browsers
    // without logging the current dashboard session out.
    await revokeKratosSessionsForIdentity(identityId)
  },
}

// The Kratos identity id is resolved once at sign-in and cached on the session
// (see src/auth.ts). Fall back to a per-request lookup (by the E2B user id, then
// the verified email) for sessions minted before that wiring existed or when
// the sign-in resolution failed.
async function resolveIdentityId(session: Session): Promise<string | null> {
  if (session.identityId) return session.identityId

  const identity = await resolveOryIdentity({
    subjects: [session.user.id],
    email: session.user.email,
  })
  return identity?.id ?? null
}

async function readSession(): Promise<Session | null> {
  try {
    return await authjs()
  } catch (error) {
    l.error(
      {
        key: 'auth_provider:ory_get_session:error',
        error: serializeErrorForLog(error),
      },
      'Auth.js auth() helper threw while reading session'
    )
    return null
  }
}

function summarizeIdentityForLog(identity: Identity) {
  const traits = (identity.traits ?? {}) as Record<string, unknown>

  return {
    id: identity.id,
    external_id: identity.external_id ?? null,
    schema_id: identity.schema_id,
    state: identity.state ?? null,
    traits: {
      email: readTraitString(traits, 'email'),
      name: readTraitString(traits, 'name'),
      keys: Object.keys(traits),
    },
    credential_keys: Object.keys(identity.credentials ?? {}),
    credentials: summarizeCredentialsForLog(identity.credentials),
  }
}

function summarizeCredentialsForLog(credentials: Identity['credentials']) {
  if (!credentials) return null

  return {
    password_credential: summarizeCredentialForLog(credentials.password),
    oidc_credential: summarizeCredentialForLog(credentials.oidc),
    other_credential_keys: Object.keys(credentials).filter(
      (key) => key !== 'password' && key !== 'oidc'
    ),
  }
}

function summarizeCredentialForLog(
  credential: IdentityCredentials | undefined
) {
  if (!credential) return null

  const config = credential.config as Record<string, unknown> | undefined

  return {
    type: credential.type ?? null,
    identifiers: credential.identifiers ?? [],
    has_config: !!config,
    config_keys: config ? Object.keys(config) : [],
    has_hashed_password:
      typeof config?.hashed_password === 'string' &&
      config.hashed_password !== '',
    uses_password_migration_hook: config?.use_password_migration_hook === true,
    oidc_providers: readOidcProvidersForLog(config),
  }
}

function readOidcProvidersForLog(config: Record<string, unknown> | undefined) {
  const providers = config?.providers
  if (!Array.isArray(providers)) return []

  return providers
    .filter(
      (provider): provider is Record<string, unknown> =>
        provider !== null && typeof provider === 'object'
    )
    .map((provider) => ({
      provider: readTraitString(provider, 'provider'),
      organization: readTraitString(provider, 'organization'),
      has_subject:
        typeof provider.subject === 'string' && provider.subject !== '',
      use_auto_link:
        typeof provider.use_auto_link === 'boolean'
          ? provider.use_auto_link
          : null,
      has_initial_access_token:
        typeof provider.initial_access_token === 'string' &&
        provider.initial_access_token !== '',
      has_initial_id_token:
        typeof provider.initial_id_token === 'string' &&
        provider.initial_id_token !== '',
      has_initial_refresh_token:
        typeof provider.initial_refresh_token === 'string' &&
        provider.initial_refresh_token !== '',
    }))
}

function readTraitString(
  source: Record<string, unknown>,
  field: string
): string | null {
  const value = source[field]
  return typeof value === 'string' && value.length > 0 ? value : null
}
