import 'server-only'

import {
  type Identity,
  type JsonPatch,
  JsonPatchOpEnum,
} from '@ory/client-fetch'
import { l } from '@/core/shared/clients/logger/logger'
import type { UpdateUserErrorCode, UpdateUserResult } from '../types'
import { getOryIdentityApi } from './client'
import { ACCOUNT_IDENTITY_CREDENTIALS } from './find-identity'
import { fromOryIdentity } from './identity'
import { isOryResponseError, readOryError } from './ory-error'

type OryUpdateUserInput = {
  identityId: string
  name?: string
  email?: string
  password?: string
}

export const oryAuthFlows = {
  async updateUser({
    identityId,
    name,
    email,
    password,
  }: OryUpdateUserInput): Promise<UpdateUserResult> {
    try {
      // A password change must go through updateIdentity (the credential import
      // path) — see setPassword. Trait-only changes use the lighter patch.
      if (password !== undefined) {
        await setPassword(identityId, { name, email, password })
      } else {
        await patchTraits(identityId, { name, email })
      }

      const identity = await getIdentityWithAccountCredentials(identityId)
      return { ok: true, user: fromOryIdentity(identity) }
    } catch (error) {
      return mapUpdateUserError(error, identityId)
    }
  },
}

async function getIdentityWithAccountCredentials(
  identityId: string
): Promise<Identity> {
  return getOryIdentityApi().getIdentity({
    id: identityId,
    includeCredential: ACCOUNT_IDENTITY_CREDENTIALS,
  })
}

// Kratos only hashes a cleartext password when it runs through the credential
// IMPORT pipeline (updateIdentity / createIdentity). A JSON-Patch write to
// `/credentials/password/config/password` is accepted with 200 but stored raw —
// `hashed_password` is left untouched, so the change appears to succeed while
// the OLD password keeps working and the new one never does. So we set the
// password via updateIdentity (PUT). Only the password credential is supplied,
// which Kratos hashes; existing credentials (e.g. oidc) are preserved. We
// re-send schema_id/state/traits/external_id/metadata to avoid clobbering them
// on the full update.
async function setPassword(
  identityId: string,
  { name, email, password }: Omit<OryUpdateUserInput, 'identityId'>
): Promise<void> {
  const api = getOryIdentityApi()
  const current = await api.getIdentity({ id: identityId })

  await api.updateIdentity({
    id: identityId,
    updateIdentityBody: {
      schema_id: current.schema_id,
      state: current.state ?? 'active',
      traits: mergeTraits(current.traits, { name, email }),
      external_id: current.external_id,
      metadata_public: current.metadata_public,
      metadata_admin: current.metadata_admin,
      credentials: { password: { config: { password } } },
    },
  })
}

async function patchTraits(
  identityId: string,
  { name, email }: Pick<OryUpdateUserInput, 'name' | 'email'>
): Promise<void> {
  const api = getOryIdentityApi()
  const jsonPatch = buildTraitPatches({ name, email })

  if (jsonPatch.length === 0) {
    return
  }

  await api.patchIdentity({ id: identityId, jsonPatch })
}

function mergeTraits(
  current: unknown,
  { name, email }: Pick<OryUpdateUserInput, 'name' | 'email'>
): Record<string, unknown> {
  const traits = { ...((current as Record<string, unknown>) ?? {}) }
  if (name !== undefined) traits.name = name
  if (email !== undefined) traits.email = email
  return traits
}

// Assumes a flat `name` trait. If the project's identity schema nests name as
// `{ first, last }`, these patch paths need to target those sub-paths instead.
function buildTraitPatches({
  name,
  email,
}: Pick<OryUpdateUserInput, 'name' | 'email'>): JsonPatch[] {
  const patches: JsonPatch[] = []

  if (name !== undefined) {
    patches.push({
      op: JsonPatchOpEnum.Replace,
      path: '/traits/name',
      value: name,
    })
  }
  if (email !== undefined) {
    patches.push({
      op: JsonPatchOpEnum.Replace,
      path: '/traits/email',
      value: email,
    })
  }

  return patches
}

async function mapUpdateUserError(
  error: unknown,
  identityId: string
): Promise<UpdateUserResult> {
  if (!isOryResponseError(error)) {
    throw error
  }

  const details = await readOryError(error)
  const code = classifyUpdateError(
    details.status,
    details.reason,
    details.message
  )

  l.error(
    {
      key: 'auth_provider:ory_update_user:error',
      user_id: identityId,
      context: { ory: details, mapped_code: code },
    },
    'Ory identity update failed'
  )

  // Unclassified failures (5xx, unexpected 4xx) are surfaced as unexpected
  // server errors rather than a misleading user-facing message.
  if (!code) {
    throw error
  }

  return { ok: false, code, message: details.message }
}

function classifyUpdateError(
  status: number,
  reason?: string,
  message?: string
): UpdateUserErrorCode | null {
  const haystack = `${reason ?? ''} ${message ?? ''}`.toLowerCase()

  if (status === 409) return 'email_exists'

  if (status === 400) {
    if (haystack.includes('password')) return 'weak_password'
    if (haystack.includes('email') || haystack.includes('valid')) {
      return 'email_invalid'
    }
  }

  return null
}
