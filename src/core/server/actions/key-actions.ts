'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { CACHE_TAGS } from '@/configs/cache'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger/logger'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'

// Create API Key

const CreateApiKeySchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
  name: z
    .string({ error: 'Name is required' })
    .min(1, 'Name cannot be empty')
    .max(50, 'Name cannot be longer than 50 characters')
    .trim(),
})

export const createApiKeyAction = authActionClient
  .schema(CreateApiKeySchema)
  .metadata({ actionName: 'createApiKey' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { name } = parsedInput

    const result = await ctx.services.keys.createApiKey(name)

    if (!result.ok) {
      l.error({
        key: 'create_api_key:error',
        message: result.error.message,
        error: result.error,
        team_id: ctx.teamId,
        user_id: ctx.session.user.id,
        context: {
          name,
        },
      })

      return returnServerError('Failed to create API Key')
    }

    updateTag(CACHE_TAGS.TEAM_API_KEYS(parsedInput.teamIdOrSlug))
    revalidatePath(`/dashboard/${parsedInput.teamIdOrSlug}/keys`, 'page')

    return {
      createdApiKey: result.data,
    }
  })

// Delete API Key

const DeleteApiKeySchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
  apiKeyId: z.uuid(),
})

export const deleteApiKeyAction = authActionClient
  .schema(DeleteApiKeySchema)
  .metadata({ actionName: 'deleteApiKey' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { apiKeyId } = parsedInput
    const result = await ctx.services.keys.deleteApiKey(apiKeyId)

    if (!result.ok) {
      l.error({
        key: 'delete_api_key_action:error',
        message: result.error.message,
        error: result.error,
        team_id: ctx.teamId,
        user_id: ctx.session.user.id,
        context: {
          apiKeyId,
        },
      })

      return returnServerError('Failed to delete API Key')
    }

    updateTag(CACHE_TAGS.TEAM_API_KEYS(parsedInput.teamIdOrSlug))
    revalidatePath(`/dashboard/${parsedInput.teamIdOrSlug}/keys`, 'page')
  })
