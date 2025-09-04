import 'server-only'

import { TeamMetricsRequestSchema } from '@/app/api/teams/[teamId]/metrics/types'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_TEAM_METRICS_DATA,
} from '@/configs/mock-data'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'

import { cache } from 'react'
import { z } from 'zod'

export const GetTeamMetricsSchema = z
  .object({
    teamId: z.string().uuid(),
    startDate: TeamMetricsRequestSchema._def.schema.shape.start,
    endDate: TeamMetricsRequestSchema._def.schema.shape.end,
  })
  .refine(
    (data) => {
      const maxSpanMs = 35 * 24 * 60 * 60 * 1000 // 35 days in ms
      return data.endDate - data.startDate <= maxSpanMs
    },
    { message: 'Date range cannot exceed 35 days' }
  )

export const getTeamMetrics = authActionClient
  .schema(GetTeamMetricsSchema)
  .metadata({ serverFunctionName: 'getTeamMetrics' })
  .action(async ({ parsedInput, ctx }) => {
    const { session } = ctx

    const teamId = parsedInput.teamId
    const { startDate: startDateMs, endDate: endDateMs } = parsedInput

    if (USE_MOCK_DATA) {
      return MOCK_TEAM_METRICS_DATA(startDateMs, endDateMs)
    }

    try {
      const startSeconds = Math.floor(startDateMs / 1000)
      const endSeconds = Math.floor(endDateMs / 1000)

      const res = await getTeamMetricsMemoized(
        session.access_token,
        teamId,
        startSeconds,
        endSeconds
      )

      if (res.error) {
        throw res.error
      }

      // transform timestamps to milliseconds
      const metrics = res.data.map((d) => ({
        ...d,
        timestamp: new Date(d.timestamp).getTime(),
      }))

      // always use our calculated step for display purposes
      // the api may return data at different granularities (e.g. 1 hour for 24h range)
      // but we want consistent display based on our step calculation
      const step = calculateTeamMetricsStep(startDateMs, endDateMs)

      l.info(
        {
          key: 'team_metrics:result',
          team_id: teamId,
          user_id: session.user.id,
          data_points: metrics.length,
          step,
        },
        'Team metrics fetched'
      )

      return {
        metrics,
        step,
      }
    } catch (error) {
      const status = error instanceof Response ? error.status : 500

      l.error(
        {
          key: 'get_team_metrics:infra_error',
          error: error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            startDate: startDateMs,
            endDate: endDateMs,
          },
        },
        `Failed to get team metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      return handleDefaultInfraError(status)
    }
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
