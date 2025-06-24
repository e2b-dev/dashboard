import 'server-only'

import { z } from 'zod'
import { authActionClient } from '@/lib/clients/action'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'
import { infra } from '@/lib/clients/api'

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

    const res = await infra.GET('/api-keys', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
    })

    if (res.error) {
      const status = res.response.status
      logError(ERROR_CODES.INFRA, '/api-keys', status, res.error, res.data)

      return handleDefaultInfraError(status)
    }

    return { apiKeys: res.data }
  })
