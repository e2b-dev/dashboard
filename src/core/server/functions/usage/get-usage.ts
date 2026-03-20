import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'
import { z } from 'zod'
import { CACHE_TAGS } from '@/configs/cache'
import { createBillingRepository } from '@/core/modules/billing/repository.server'
import {
  authActionClient,
  withTeamIdResolution,
} from '@/core/server/actions/client'
import { returnServerError } from '@/core/server/actions/utils'
import { TeamIdOrSlugSchema } from '@/core/shared/schemas/team'

const GetUsageAuthActionSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getUsage = authActionClient
  .schema(GetUsageAuthActionSchema)
  .metadata({ serverFunctionName: 'getUsage' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    'use cache'

    const { teamId } = ctx

    cacheLife('hours')
    cacheTag(CACHE_TAGS.TEAM_USAGE(teamId))

    const result = await createBillingRepository({
      accessToken: ctx.session.access_token,
      teamId,
    }).getUsage()

    if (!result.ok) {
      return returnServerError(result.error.message)
    }

    return result.data
  })
