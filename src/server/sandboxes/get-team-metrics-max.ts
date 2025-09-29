import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import { MOCK_TEAM_METRICS_MAX_DATA } from '@/configs/mock-data'
import { MAX_DAYS_AGO } from '@/features/dashboard/sandboxes/monitoring/time-picker/constants'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { z } from 'zod'

export const GetTeamMetricsMaxSchema = z
  .object({
    teamId: z.uuid(),
    startDate: z
      .number()
      .int()
      .positive()
      .describe('Unix timestamp in milliseconds')
      .refine(
        (start) => {
          const now = Date.now()

          return start >= now - MAX_DAYS_AGO
        },
        {
          message: `Start date cannot be more than ${MAX_DAYS_AGO / (1000 * 60 * 60 * 24)} days ago`,
        }
      ),
    endDate: z
      .number()
      .int()
      .positive()
      .describe('Unix timestamp in milliseconds')
      .refine((end) => end <= Date.now(), {
        message: 'End date cannot be in the future',
      }),
    metric: z.enum(['concurrent_sandboxes', 'sandbox_start_rate']),
  })
  .refine(
    (data) => {
      return data.endDate - data.startDate <= MAX_DAYS_AGO
    },
    {
      message: `Date range cannot exceed ${MAX_DAYS_AGO / (1000 * 60 * 60 * 24)} days`,
    }
  )

export const getTeamMetricsMax = authActionClient
  .schema(GetTeamMetricsMaxSchema)
  .metadata({ serverFunctionName: 'getTeamMetricsMax' })
  .action(async ({ parsedInput, ctx }) => {
    const { session } = ctx
    const {
      teamId,
      startDate: startDateMs,
      endDate: endDateMs,
      metric,
    } = parsedInput

    if (USE_MOCK_DATA) {
      return MOCK_TEAM_METRICS_MAX_DATA(startDateMs, endDateMs, metric)
    }

    // convert milliseconds to seconds for the API
    const startSeconds = Math.floor(startDateMs / 1000)
    const endSeconds = Math.floor(endDateMs / 1000)

    const res = await infra.GET('/teams/{teamID}/metrics/max', {
      params: {
        path: {
          teamID: teamId,
        },
        query: {
          start: startSeconds,
          end: endSeconds,
          metric,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      cache: 'no-store',
    })

    if (res.error) {
      const status = res.response.status

      l.error(
        {
          key: 'get_team_metrics_max:infra_error',
          error: res.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            startDate: startDateMs,
            endDate: endDateMs,
            metric,
          },
        },
        `Failed to get team metrics max: ${res.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    // since javascript timestamps are in milliseconds, we want to convert the timestamp back to milliseconds
    const timestampMs = res.data.timestampUnix * 1000

    return {
      timestamp: timestampMs,
      value: res.data.value,
      metric,
    }
  })
