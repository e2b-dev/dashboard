import 'server-only'

import { z } from 'zod'
import { createWebhooksRepository } from '@/core/domains/webhooks/repository.server'
import {
  authActionClient,
  withTeamAuthedRequestRepository,
  withTeamIdResolution,
} from '@/core/server/actions/client'
import { l } from '@/lib/clients/logger/logger'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { handleDefaultInfraError } from '@/lib/utils/action'

const GetWebhooksSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

const withWebhooksRepository = withTeamAuthedRequestRepository(
  createWebhooksRepository,
  (webhooksRepository) => ({ webhooksRepository })
)

export const getWebhooks = authActionClient
  .schema(GetWebhooksSchema)
  .metadata({ serverFunctionName: 'getWebhook' })
  .use(withTeamIdResolution)
  .use(withWebhooksRepository)
  .action(async ({ ctx }) => {
    const { session, teamId } = ctx

    const result = await ctx.webhooksRepository.listWebhooks()

    if (!result.ok) {
      const status = result.error.status
      l.error(
        {
          key: 'get_webhooks:infra_error',
          status,
          error: result.error,
          team_id: teamId,
          user_id: session.user.id,
        },
        `Failed to get webhook: ${status}: ${result.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    return { webhooks: result.data }
  })
