import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { cacheLife, cacheTag } from 'next/cache'
import { z } from 'zod'

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
