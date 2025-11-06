import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'
import { UsageResponse } from '@/types/billing.types'
import { cacheLife, cacheTag } from 'next/cache'
import { z } from 'zod'

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

    cacheLife('default')
    cacheTag(CACHE_TAGS.TEAM_USAGE(teamId))

    const accessToken = ctx.session.access_token

    const response = await fetch(
      `${process.env.BILLING_API_URL}/v2/teams/${teamId}/usage`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
        },
      }
    )

    if (!response.ok) {
      const text = (await response.text()) ?? 'Failed to fetch usage data'
      return returnServerError(text)
    }

    const responseData: UsageResponse = await response.json()

    // convert unix seconds to milliseconds because JavaScript
    const data: UsageResponse = {
      ...responseData,
      hour_usages: responseData.hour_usages.map((hour) => ({
        ...hour,
        timestamp: hour.timestamp * 1000,
      })),
    }

    return data
  })
