import { cacheLife, cacheTag } from 'next/cache'
import { z } from 'zod'
import { CACHE_TAGS } from '@/configs/cache'
import { createKeysRepository } from '@/core/modules/keys/repository.server'
import {
  authActionClient,
  withTeamSlugResolution,
} from '@/core/server/actions/client'
import { handleDefaultInfraError } from '@/core/server/actions/utils'
import { l } from '@/core/shared/clients/logger/logger'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

const GetApiKeysSchema = z.object({
  teamSlug: TeamSlugSchema,
})

export const getTeamApiKeys = authActionClient
  .schema(GetApiKeysSchema)
  .metadata({ serverFunctionName: 'getTeamApiKeys' })
  .use(withTeamSlugResolution)
  .action(async ({ ctx }) => {
    'use cache'
    cacheLife('default')
    const { session, teamId } = ctx
    cacheTag(CACHE_TAGS.TEAM_API_KEYS(teamId))

    const result = await createKeysRepository({
      accessToken: session.access_token,
      teamId,
    }).listTeamApiKeys()

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
