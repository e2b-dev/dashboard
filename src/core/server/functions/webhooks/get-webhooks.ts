import 'server-only'

import { z } from 'zod'
import { createWebhooksRepository } from '@/core/modules/webhooks/repository.server'
import {
  authActionClient,
  withTeamAuthedRequestRepository,
  withTeamSlugResolution,
} from '@/core/server/actions/client'
import { handleDefaultInfraError } from '@/core/server/actions/utils'
import { l } from '@/core/shared/clients/logger/logger'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

const GetWebhooksSchema = z.object({
  teamSlug: TeamSlugSchema,
})

const withWebhooksRepository = withTeamAuthedRequestRepository(
  createWebhooksRepository,
  (webhooksRepository) => ({ webhooksRepository })
)

export const getWebhooks = authActionClient
  .schema(GetWebhooksSchema)
  .metadata({ serverFunctionName: 'getWebhook' })
  .use(withTeamSlugResolution)
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
