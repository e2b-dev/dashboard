import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { z } from 'zod'

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

      l.error({
        key: 'get_team_api_keys:error',
        error: res.error,
        team_id: teamId,
        user_id: session.user.id,
        context: {
          status,
        },
      })

      return handleDefaultInfraError(status)
    }

    return { apiKeys: res.data }
  })
