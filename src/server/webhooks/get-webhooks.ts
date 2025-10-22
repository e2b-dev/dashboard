import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { z } from 'zod'

const GetWebhooksSchema = z.object({
  teamId: z.string({ required_error: 'Team ID is required' }).uuid(),
})

export const getWebhooks = authActionClient
  .schema(GetWebhooksSchema)
  .metadata({ serverFunctionName: 'getWebhook' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

    const accessToken = session.access_token

    const response = await infra.GET('/events/webhooks', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
    })

    if (response.error) {
      const status = response.response.status

      if (status === 404) {
        return { webhooks: [] }
      }

      l.error(
        {
          key: 'get_webhooks:infra_error',
          status,
          error: response.error,
          team_id: teamId,
          user_id: session.user.id,
        },
        `Failed to get webhook: ${status}: ${response.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    const data = response.data

    return { webhooks: data }
  })
