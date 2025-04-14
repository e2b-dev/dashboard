'use server'

import { API_KEY_PREFIX } from '@/configs/constants'
import { checkUserTeamAuthorization } from '@/lib/utils/server'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { InvalidParametersError } from '@/types/errors'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'

// Create API Key

const CreateApiKeySchema = z.object({
  teamId: z.string({ required_error: 'Team ID is required' }).uuid(),
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name cannot be empty')
    .max(50, 'Name cannot be longer than 50 characters')
    .trim(),
})

export async function generateTeamApiKey(): Promise<string> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(20))
  const hexString = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return API_KEY_PREFIX + hexString
}

export const createApiKeyAction = authActionClient
  .schema(CreateApiKeySchema)
  .metadata({ actionName: 'createApiKey' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, name } = parsedInput
    const { user, supabase } = ctx

    const isAuthorized = await checkUserTeamAuthorization(user.id, teamId)

    if (!isAuthorized)
      return returnServerError('Not authorized to create team api keys')

    const apiKeyValue = await generateTeamApiKey()

    const { error } = await supabaseAdmin
      .from('team_api_keys')
      .insert({
        team_id: teamId,
        name: name,
        api_key: apiKeyValue,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/keys`, 'page')

    return {
      createdApiKey: apiKeyValue,
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
    const { user, supabase } = ctx

    const isAuthorized = await checkUserTeamAuthorization(user.id, teamId)

    if (!isAuthorized) {
      return returnServerError('Not authorized to delete team api keys')
    }

    const { data: apiKeys, error: fetchError } = await supabaseAdmin
      .from('team_api_keys')
      .select('id')
      .eq('team_id', teamId)

    if (fetchError) {
      throw fetchError
    }

    if (apiKeys.length === 1) {
      return returnServerError(
        'A team must have at least one API key. Please create a new API key before deleting this one.'
      )
    }

    const { error } = await supabaseAdmin
      .from('team_api_keys')
      .delete()
      .eq('team_id', teamId)
      .eq('id', apiKeyId)

    if (error) {
      throw error
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/keys`, 'page')
  })
