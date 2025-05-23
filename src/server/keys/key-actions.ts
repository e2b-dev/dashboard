'use server'

import { checkUserTeamAuthorization, getApiUrl } from '@/lib/utils/server'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'
import { CreatedTeamAPIKey } from '@/types/api'

// Create API Key

const CreateApiKeySchema = z.object({
  teamId: z.string({ required_error: 'Team ID is required' }).uuid(),
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name cannot be empty')
    .max(50, 'Name cannot be longer than 50 characters')
    .trim(),
})

export const createApiKeyAction = authActionClient
  .schema(CreateApiKeySchema)
  .metadata({ actionName: 'createApiKey' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, name } = parsedInput
    const { session } = ctx

    const accessToken = session.access_token

    const { url } = await getApiUrl()

    const apiKeyResponse = await fetch(`${url}/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      body: JSON.stringify({ name }),
    })

    if (!apiKeyResponse.ok) {
      const text = await apiKeyResponse.text()
      logError(ERROR_CODES.INFRA, 'Failed to create api key', {
        teamId,
        name,
        error: text,
      })
      return returnServerError('Failed to create api key')
    }

    const apiKeyData = (await apiKeyResponse.json()) as CreatedTeamAPIKey

    revalidatePath(`/dashboard/[teamIdOrSlug]/keys`, 'page')

    return {
      createdApiKey: apiKeyData,
    }
  })

// Delete API Key

const DeleteApiKeySchema = z.object({
  teamId: z.string({ required_error: 'Team ID is required' }).uuid(),
  apiKeyId: z.string({ required_error: 'API Key ID is required' }).uuid(),
})

export const deleteApiKeyAction = authActionClient
  .schema(DeleteApiKeySchema)
  .metadata({ actionName: 'deleteApiKey' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, apiKeyId } = parsedInput
    const { session } = ctx

    const accessToken = session.access_token

    const { url } = await getApiUrl()

    const response = await fetch(`${url}/api-keys/${apiKeyId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      logError(ERROR_CODES.INFRA, 'Failed to delete api key', {
        teamId,
        apiKeyId,
        error: text,
      })

      return returnServerError(text)
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/keys`, 'page')
  })
