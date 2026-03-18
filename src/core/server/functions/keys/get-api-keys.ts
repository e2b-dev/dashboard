import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'
import { z } from 'zod'
import { CACHE_TAGS } from '@/configs/cache'
import { authActionClient, withTeamIdResolution } from '@/core/server/actions/client'
import { l } from '@/lib/clients/logger/logger'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { handleDefaultInfraError } from '@/lib/utils/action'

const GetApiKeysSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getTeamApiKeys = authActionClient
  .schema(GetApiKeysSchema)
  .metadata({ serverFunctionName: 'getTeamApiKeys' })
  .use(withTeamIdResolution)
  .action(async ({ ctx, parsedInput }) => {
    'use cache'
    cacheLife('default')
    cacheTag(CACHE_TAGS.TEAM_API_KEYS(parsedInput.teamIdOrSlug))

    const { session, teamId } = ctx

    const result = await ctx.services.keys.listTeamApiKeys()

    if (!result.ok) {
      const status = result.error.status

      l.error({
        key: 'get_team_api_keys:error',
        error: result.error,
        team_id: teamId,
        user_id: session.user.id,
        context: {
          status,
        },
      })

      return handleDefaultInfraError(status)
    }

    return { apiKeys: result.data }
  })
