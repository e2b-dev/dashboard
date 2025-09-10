import 'server-only'

import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_TEAM_METRICS_DATA,
} from '@/configs/mock-data'
import { authActionClient } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { z } from 'zod'
import getTeamMetricsMemoized from './get-team-metrics-memo'

export const GetTeamMetricsSchema = z
  .object({
    teamId: z.string().uuid(),
    startDate: z
      .number()
      .int()
      .positive()
      .describe('Unix timestamp in milliseconds')
      .refine(
        (start) => {
          const now = Date.now()
          const maxDaysAgo = 31 * 24 * 60 * 60 * 1000 // 31 days in ms
          return start >= now - maxDaysAgo
        },
        { message: 'Start date cannot be more than 31 days ago' }
      ),
    endDate: z
      .number()
      .int()
      .positive()
      .describe('Unix timestamp in milliseconds')
      .refine(
        (end) => end <= Date.now() + 60 * 1000, // allow 60 seconds in future for clock skew
        { message: 'End date cannot be more than 60 seconds in the future' }
      ),
  })
  .refine(
    (data) => {
      const maxSpanMs = 31 * 24 * 60 * 60 * 1000 // 31 days in ms
      return data.endDate - data.startDate <= maxSpanMs
    },
    { message: 'Date range cannot exceed 31 days' }
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

      // calculate step to determine overfetch amount
      const step = calculateTeamMetricsStep(startDateMs, endDateMs)
      const overfetchSeconds = Math.ceil(step / 1000) // overfetch by one step

      // fetch with overfetch to capture boundary points
      const res = await getTeamMetricsMemoized(
        session.access_token,
        teamId,
        startSeconds,
        endSeconds + overfetchSeconds
      )

      if (res.error) {
        throw res.error
      }

      // transform timestamps and filter to requested range (with tolerance)
      // allow data points up to half a step beyond the end for boundary cases
      const tolerance = step * 0.5
      const metrics = res.data
        .map((d) => ({
          ...d,
          timestamp: new Date(d.timestamp).getTime(),
        }))
        .filter(
          (d) =>
            d.timestamp >= startDateMs && d.timestamp <= endDateMs + tolerance
        )

      l.info(
        {
          key: 'team_metrics:result',
          team_id: teamId,
          user_id: session.user.id,
          data_points: metrics.length,
          step,
          overfetch_seconds: overfetchSeconds,
        },
        'Team metrics fetched with overfetch'
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
