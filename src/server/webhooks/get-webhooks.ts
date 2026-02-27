import 'server-only'

import { z } from 'zod'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { handleDefaultInfraError } from '@/lib/utils/action'

const GetWebhooksSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getWebhooks = authActionClient
  .schema(GetWebhooksSchema)
  .metadata({ serverFunctionName: 'getWebhook' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { session, teamId } = ctx

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
