import 'server-only'

import type { Session } from 'next-auth'
import { cache } from 'react'
import { auth as authjs, signOut as authjsSignOut } from '@/auth'
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
import { readOrySessionFields } from './authjs-session-boundary'
import { buildOryStartURL } from './build-start-url'
import {
  ACCOUNT_IDENTITY_CREDENTIALS,
  resolveOryIdentity,
} from './find-identity'
import { oryAuthFlows } from './flows'
import { isReauthFresh } from './freshness'
import { fromAuthSession, fromOryIdentity } from './identity'
import { revokeKratosSessionsForIdentity } from './kratos-session'
import { revokeOryOAuthSessionsForSubject } from './oauth-session'
import { completeOrySignOut } from './signout-flow'

const ACCOUNT_SETTINGS_REAUTH_RETURN_TO = `${PROTECTED_URLS.ACCOUNT_SETTINGS}?reauth=1`

export async function getAuthContext(
  authSession?: Session | null
): Promise<AuthContext | null> {
  return getAuthContextFromOrySession(await readCurrentSession(authSession))
}

export async function getUserProfile(
  authSession?: Session | null
): Promise<AuthUser | null> {
  const session = await readCurrentSession(authSession)
  if (!session?.user?.id) return null
  const serverFields = readOrySessionFields(session)

  // The live profile needs the full Kratos identity (traits + credentials).
  // The cached identity id hits directly; user.id and email are fallbacks.
  const identity = await resolveOryIdentity({
    subjects: [serverFields?.identityId, session.user.id],
    email: session.user.email,
    includeCredential: ACCOUNT_IDENTITY_CREDENTIALS,
  })

  return identity
    ? fromOryIdentity(identity, { userId: session.user.id })
    : null
}

export async function signOut(
  options?: SignOutOptions
): Promise<SignOutResult> {
  return {
    redirectTo: await completeOrySignOut(options?.origin),
  }
}

export async function updateUser(
  input: UpdateUserInput,
  authSession?: Session | null
): Promise<UpdateUserResult> {
  const session = await readCurrentSession(authSession)
  if (!session?.user?.id) {
    throw new Error('updateUser called without an authenticated Ory session')
  }
  const serverFields = readOrySessionFields(session)

  // Changing the password OR the email is privileged: require a recent active
  // login so a stolen dashboard session can't silently take over the account.
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

  return oryAuthFlows.updateUser({
    identityId,
    name: input.name,
    email: input.email,
    password: input.password,
  })
}

export async function startReauthForAccountSettings(): Promise<ReauthDispatch> {
  return {
    to: buildOryStartURL('reauth', ACCOUNT_SETTINGS_REAUTH_RETURN_TO),
  }
}

export async function handleCredentialChangeSuccess(
  authSession?: Session | null
): Promise<void> {
  const session = await readCurrentSession(authSession)
  if (!session?.user?.id) return

  // Hydra's OAuth2 subject is the Kratos identity id, not AuthUser.id, so both
  // revocations key off the resolved identity id.
  const identityId = await resolveIdentityId(session)
  if (identityId) {
    await revokeOryOAuthSessionsForSubject(identityId)
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
}

export function getAuthContextFromOrySession(
  session: Session | null | undefined
): AuthContext | null {
  if (!session?.user?.id) return null

  const serverFields = readOrySessionFields(session)
  if (!serverFields?.accessToken) return null

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

  // Without external_id we cannot resolve the public.users.id; the jwt callback
  // has already tried to backfill it from Kratos, so force a re-auth rather than
  // expose the Kratos identity id as AuthUser.id.
  if (!serverFields.externalId) {
    l.warn(
      {
        key: 'auth_provider:ory_session_missing_external_id',
        user_id: session.user.id,
      },
      'Auth.js session has no external_id; treating as unauthenticated'
    )
    return null
  }

  return {
    user: fromAuthSession(session),
    accessToken: serverFields.accessToken,
  } satisfies AuthContext
}

async function resolveIdentityId(session: Session): Promise<string | null> {
  const serverFields = readOrySessionFields(session)
  if (serverFields?.identityId) return serverFields.identityId

  const identity = await resolveOryIdentity({
    subjects: [session.user.id],
    email: session.user.email,
  })
  return identity?.id ?? null
}

function readCurrentSession(
  authSession: Session | null | undefined
): Promise<Session | null> {
  return authSession === undefined
    ? readSession()
    : Promise.resolve(authSession)
}

const readSession = cache(async (): Promise<Session | null> => {
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
})
