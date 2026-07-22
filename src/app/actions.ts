'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { API_KEY_PREFIX } from '@/configs/api'
import { actionClient } from '@/core/server/actions/client'
import { returnServerError } from '@/core/server/actions/utils'
import { setApiKeyCookie, validateApiKey } from '@/core/server/auth'

const SetApiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, 'API key is required')
    .startsWith(API_KEY_PREFIX, `API keys start with "${API_KEY_PREFIX}"`),
  destination: z.string().startsWith('/').default('/sandboxes'),
})

export const setApiKeyAction = actionClient
  .schema(SetApiKeySchema)
  .metadata({ actionName: 'setApiKey' })
  .action(async ({ parsedInput }) => {
    const { apiKey, destination } = parsedInput

    const result = await validateApiKey(apiKey)

    if (!result.valid) {
      if (result.reason === 'unauthorized') {
        return returnServerError('Invalid API key')
      }
      return returnServerError(
        'Could not reach the E2B API to validate the key. Please try again.'
      )
    }

    await setApiKeyCookie(apiKey)

    redirect(destination)
  })
