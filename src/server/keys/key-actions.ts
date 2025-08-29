'use server'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { returnServerError } from '@/lib/utils/action'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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

    const res = await infra.POST('/api-keys', {
      body: {
        name,
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
    })

    if (res.error) {
      l.error({
        key: 'create_api_key:error',
        message: res.error.message,
        error: res.error,
        team_id: teamId,
        user_id: session.user.id,
        context: {
          name,
        },
      })

      return returnServerError('Failed to create API Key')
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/keys`, 'page')

    return {
      createdApiKey: res.data,
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

    const res = await infra.DELETE('/api-keys/{apiKeyID}', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      params: {
        path: {
          apiKeyID: apiKeyId,
        },
      },
    })

    if (res.error) {
      l.error({
        key: 'delete_api_key_action:error',
        message: res.error.message,
        error: res.error,
        team_id: teamId,
        user_id: session.user.id,
        context: {
          apiKeyId,
        },
      })

      return returnServerError('Failed to delete API Key')
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/keys`, 'page')
  })
