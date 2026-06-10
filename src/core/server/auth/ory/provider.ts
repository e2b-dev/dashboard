import 'server-only'

import { headers } from 'next/headers'
import type { Session } from 'next-auth'
import { cache } from 'react'
import { auth as authjs, signOut as authjsSignOut } from '@/auth'
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
  type ForwardedOryRequestSession,
  type OrySessionFields,
  readForwardedOryRequestSession,
  readOrySessionFields,
} from './authjs-session-boundary'
import { buildOryStartURL } from './build-start-url'
import {
  ACCOUNT_IDENTITY_CREDENTIALS,
  resolveOryIdentity,
} from './find-identity'
import { oryAuthFlows } from './flows'
import { isReauthFresh } from './freshness'
import { fromOryIdentity } from './identity'
import { revokeKratosSessionsForIdentity } from './kratos-session'
import { revokeOryOAuthSessionsForSubject } from './oauth-session'
import { completeOrySignOut } from './signout-flow'

// Where the account-settings page expects to land after a forced re-auth so it
// reveals the password form (matches the Supabase ?reauth=1 contract).
const ACCOUNT_SETTINGS_REAUTH_RETURN_TO = `${PROTECTED_URLS.ACCOUNT_SETTINGS}?reauth=1`

type OryRequestSessionUser = {
  id: string
  email: string | null
  name: string | null
  image: string | null
}

type OryRequestSession =
  | {
      status: 'session'
      user: OryRequestSessionUser
      fields: OrySessionFields
    }
  | { status: 'unauthenticated'; error?: string }

export const oryAuthProvider: AuthProvider = {
  async getAuthContext() {
    const session = await readRequestSession()
    if (!session || session.status === 'unauthenticated') return null

    const serverFields = session.fields

    if (!serverFields.accessToken) {
      return null
    }

    if (serverFields.error) {
      l.warn(
        {
          key: 'auth_provider:ory_session_error',
          user_id: session.user.id,
          context: { error: serverFields.error },
        },
        `Auth.js session reports error '${serverFields.error}'; treating as unauthenticated`
      )
      return null
    }

    return {
      user: fromRequestSessionUser(session.user),
      accessToken: serverFields.accessToken,
    } satisfies AuthContext
  },

  async getUserProfile(): Promise<AuthUser | null> {
    const session = await readRequestSession()
    if (!session || session.status === 'unauthenticated') return null
    const serverFields = session.fields

    // The live profile needs the full Kratos identity (traits + credentials).
    // The cached identity id hits directly; user.id and email are
    // fallbacks. Callers (the tRPC profile query) time this out and fall back to
    // the cheap session user, so a null/slow response never blocks the dashboard.
    const identity = await resolveOryIdentity({
      subjects: [serverFields.identityId, session.user.id],
      email: session.user.email,
      includeCredential: ACCOUNT_IDENTITY_CREDENTIALS,
    })

    return identity
      ? fromOryIdentity(identity, { userId: session.user.id })
      : null
  },

  async signOut(options) {
    return {
      redirectTo: await completeOrySignOut(options?.origin),
    }
  },

  async updateUser(input: UpdateUserInput): Promise<UpdateUserResult> {
    const session = await readRequestSession()
    if (!session || session.status === 'unauthenticated') {
      throw new Error('updateUser called without an authenticated Ory session')
    }
    const serverFields = session.fields

    // Changing the password OR the email is privileged: require a recent active
    // login so a stolen dashboard session can't silently take over the account
    // (swap the email, then reset the password via the new inbox). The caller
    // turns this into the forced OAuth2 re-auth round-trip.
    const changesCredentials =
      input.password !== undefined || input.email !== undefined
    if (changesCredentials && !isReauthFresh(serverFields?.idToken)) {
      return { ok: false, code: 'reauthentication_needed' }
    }

    const identityId = await resolveIdentityId(session)
    if (!identityId) {
      throw new Error(
        'updateUser could not resolve an Ory identity for the session subject'
      )
    }

    const result = await oryAuthFlows.updateUser({
      identityId,
      name: input.name,
      email: input.email,
      password: input.password,
    })

    if (!result.ok) return result

    return {
      ...result,
      user: {
        ...result.user,
        id: session.user.id,
      },
    }
  },

  async startReauthForAccountSettings(): Promise<ReauthDispatch> {
    return {
      kind: 'redirect',
      to: buildOryStartURL('reauth', ACCOUNT_SETTINGS_REAUTH_RETURN_TO),
    }
  },

  async handleCredentialChangeSuccess(): Promise<void> {
    const session = await readRequestSession()
    if (!session || session.status === 'unauthenticated') return

    await revokeOryOAuthSessionsForSubject(session.user.id)

    const identityId = await resolveIdentityId(session)
    if (identityId) {
      await revokeKratosSessionsForIdentity(identityId)
    }

    try {
      await authjsSignOut({ redirect: false })
    } catch (error) {
      l.warn(
        {
          key: 'auth_provider:ory_sign_out_after_credential_change:error',
          error: serializeErrorForLog(error),
        },
        'failed to clear current Auth.js session after credential change'
      )
    }
  },
}

// The Kratos identity id is resolved once at sign-in and cached on the session
// (see src/auth.ts). Fall back to a per-request lookup (by the E2B user id, then
// the verified email) for sessions minted before that wiring existed or when
// the sign-in resolution failed.
async function resolveIdentityId(
  session: Extract<OryRequestSession, { status: 'session' }>
): Promise<string | null> {
  if (session.fields.identityId) return session.fields.identityId

  const identity = await resolveOryIdentity({
    subjects: [session.user.id],
    email: session.user.email,
  })
  return identity?.id ?? null
}

async function readRequestSession(): Promise<OryRequestSession | null> {
  return (await readForwardedRequestSession()) ?? readAuthJsRequestSession()
}

const readForwardedRequestSession = cache(
  async (): Promise<OryRequestSession | null> => {
    try {
      const requestHeaders = new Headers(await headers())
      const forwarded = readForwardedOryRequestSession(requestHeaders)
      if (!forwarded) return null
      return fromForwardedOrySession(forwarded)
    } catch {
      return null
    }
  }
)

const readAuthJsRequestSession = cache(
  async (): Promise<OryRequestSession | null> => {
    const session = await readAuthJsSession()
    if (!session) return null

    const user = readSessionUser(session)
    if (!user) return { status: 'unauthenticated' }

    return {
      status: 'session',
      user,
      fields: readOrySessionFields(session) ?? {},
    }
  }
)

async function readAuthJsSession(): Promise<Session | null> {
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

function fromForwardedOrySession(
  session: ForwardedOryRequestSession
): OryRequestSession {
  if (session.status === 'unauthenticated') return session

  return {
    status: 'session',
    user: session.user,
    fields: session.fields,
  }
}

function readSessionUser(session: Session): OryRequestSessionUser | null {
  if (!session.user?.id) return null

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  }
}

function fromRequestSessionUser(user: OryRequestSessionUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.image,
    providers: [],
    canChangeEmail: false,
    canChangePassword: false,
  }
}
