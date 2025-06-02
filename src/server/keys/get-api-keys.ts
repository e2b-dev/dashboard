import 'server-only'

import { z } from 'zod'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'
import { TeamAPIKey } from '@/types/api'

const GetApiKeysSchema = z.object({
  teamId: z.string({ required_error: 'Team ID is required' }).uuid(),
})

export const getTeamApiKeys = authActionClient
  .schema(GetApiKeysSchema)
  .metadata({ serverFunctionName: 'getTeamApiKeys' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

    const accessToken = session.access_token

    const response = await fetch(`${process.env.INFRA_API_URL}/api-keys`, {
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      logError(ERROR_CODES.INFRA, 'Failed to get api keys', {
        teamId,
        error: text,
      })
      return returnServerError('Failed to get api keys')
    }

    const data = (await response.json()) as TeamAPIKey[]

    return { apiKeys: data }
  })
