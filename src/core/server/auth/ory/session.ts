import 'server-only'

import { getServerSession } from '@ory/nextjs/app'
import { cookies } from 'next/headers'
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
import { fromKratosSessionIdentity, fromOryIdentity } from './identity'
import { revokeKratosSessionsForIdentity } from './kratos-session'
import { revokeOryOAuthSessionsForSubject } from './oauth-session'
import { E2B_SESSION_COOKIE, openOrySession } from './session-cookie'
import { completeOrySignOut } from './signout-flow'

const ACCOUNT_SETTINGS_REAUTH_RETURN_TO = `${PROTECTED_URLS.ACCOUNT_SETTINGS}?reauth=1`

// Kratos owns the session. Identity (the gate) comes from `whoami`; the Hydra
// access token (API access only) comes from the e2b_session cookie, which the
// middleware keeps fresh. For E2B the OAuth subject equals the Kratos identity
// id, so kratos.identity.id is both the dashboard user id and the Kratos id used
// for admin operations. This module never refreshes — it is a pure reader.

export async function getAuthContext(): Promise<AuthContext | null> {
  const kratos = await readKratosSession()
  if (!kratos?.active || !kratos.identity) return null

  const tokens = await readOrySessionTokens()
  if (!tokens?.accessToken) return null

  return {
    user: fromKratosSessionIdentity(kratos.identity),
    accessToken: tokens.accessToken,
  }
}

export async function getUserProfile(): Promise<AuthUser | null> {
  const identityId = (await readKratosSession())?.identity?.id
  if (!identityId) return null

  // The rich profile needs the full identity (traits + credentials).
  const identity = await resolveOryIdentity({
    subjects: [identityId],
    includeCredential: ACCOUNT_IDENTITY_CREDENTIALS,
  })

  return identity ? fromOryIdentity(identity, { userId: identityId }) : null
}

export async function signOut(
  options?: SignOutOptions
): Promise<SignOutResult> {
  return {
    redirectTo: await completeOrySignOut(options?.origin),
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

  if (!result.ok) return result

  return { ...result, user: { ...result.user, id: identityId } }
}

export async function startReauthForAccountSettings(): Promise<ReauthDispatch> {
  return {
    to: buildOryStartURL('reauth', ACCOUNT_SETTINGS_REAUTH_RETURN_TO),
  }
}

export async function handleCredentialChangeSuccess(): Promise<void> {
  const identityId = (await readKratosSession())?.identity?.id
  if (!identityId) return

  await Promise.all([
    revokeOryOAuthSessionsForSubject(identityId),
    revokeKratosSessionsForIdentity(identityId),
  ])

  await clearOrySessionCookie()
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

const readOrySessionTokens = cache(async () => {
  const cookieStore = await cookies()
  return openOrySession(cookieStore.get(E2B_SESSION_COOKIE)?.value)
})

async function clearOrySessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(E2B_SESSION_COOKIE)
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
