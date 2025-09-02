import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { fillTeamMetricsWithZeros } from '@/lib/utils/sandboxes'
import { cache } from 'react'
import { z } from 'zod'

export const GetTeamMetricsSchema = z.object({
  teamId: z.string().uuid(),
  startDate: z
    .number()
    .int()
    .positive()
    .describe('Unix timestamp in milliseconds'),
  endDate: z
    .number()
    .int()
    .positive()
    .describe('Unix timestamp in milliseconds'),
})

export const getTeamMetrics = authActionClient
  .schema(GetTeamMetricsSchema)
  .metadata({ serverFunctionName: 'getTeamMetrics' })
  .action(async ({ parsedInput, ctx }) => {
    const { session } = ctx

    const teamId = parsedInput.teamId
    const { startDate: startDateMs, endDate: endDateMs } = parsedInput

    // convert milliseconds to seconds
    const startDate = Math.floor(startDateMs / 1000)
    const endDate = Math.floor(endDateMs / 1000)

    const res = await getTeamMetricsMemoized(
      session.access_token,
      teamId,
      startDate,
      endDate
    )

    if (res.error) {
      const status = res.response.status

      l.error(
        {
          key: 'get_team_metrics:infra_error',
          message: res.error.message,
          error: res.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            startDate,
            endDate,
          },
        },
        `Failed to get team metrics: ${res.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    const processedData = res.data.map((d) => ({
      ...d,
      timestamp: new Date(d.timestamp).getTime(),
    }))

    const step =
      processedData[1]?.timestamp && processedData[0]?.timestamp
        ? processedData[1]?.timestamp - processedData[0]?.timestamp
        : 0

    const filledData = fillTeamMetricsWithZeros(
      processedData,
      startDateMs,
      endDateMs,
      step
    )

    return { metrics: filledData, step }
  })

const getTeamMetricsMemoized = cache(
  async (
    accessToken: string,
    teamId: string,
    startDate: number,
    endDate: number
  ) => {
    return await infra.GET('/teams/{teamID}/metrics', {
      params: {
        path: {
          teamID: teamId,
        },
        query: {
          start: startDate,
          end: endDate,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      cache: 'no-store',
    })
  }
)
