import 'server-only'

import { type JsonPatch, JsonPatchOpEnum } from '@ory/client-fetch'
import { l } from '@/core/shared/clients/logger/logger'
import type { UpdateUserErrorCode, UpdateUserResult } from '../types'
import { getOryIdentityApi } from './client'
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
    const jsonPatch = buildIdentityPatches({ name, email, password })

    try {
      const identity = await getOryIdentityApi().patchIdentity({
        id: identityId,
        jsonPatch,
      })

      return { ok: true, user: fromOryIdentity(identity) }
    } catch (error) {
      return mapUpdateUserError(error, identityId)
    }
  },
}

// Assumes a flat `name` trait. If the project's identity schema nests name as
// `{ first, last }`, this patch path needs to target those sub-paths instead.
function buildIdentityPatches({
  name,
  email,
  password,
}: Omit<OryUpdateUserInput, 'identityId'>): JsonPatch[] {
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
  if (password !== undefined) {
    // The password-settings UI is only shown for identities that already have
    // the email/password credential, so the config object exists to replace.
    patches.push({
      op: JsonPatchOpEnum.Replace,
      path: '/credentials/password/config/password',
      value: password,
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
