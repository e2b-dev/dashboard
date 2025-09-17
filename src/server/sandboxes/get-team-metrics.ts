import 'server-only'

import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_TEAM_METRICS_DATA,
} from '@/configs/mock-data'
import { MAX_DAYS_AGO } from '@/features/dashboard/sandboxes/monitoring/time-picker/constants'
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
  })
  .refine(
    (data) => {
      return data.endDate - data.startDate <= MAX_DAYS_AGO
    },
    {
      message: `Date range cannot exceed ${MAX_DAYS_AGO / (1000 * 60 * 60 * 24)} days`,
    }
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

    const startS = Math.floor(startDateMs / 1000)
    const endS = Math.floor(endDateMs / 1000)

    // calculate step to determine overfetch amount
    const stepMs = calculateTeamMetricsStep(startDateMs, endDateMs)

    // overfetch by one step
    // the overfetch is accounted for, when post-processing the data using fillTeamMetricsWithZeros

    // TODO: refactor the overfetch handling, to make this behavior more explicit
    const overfetchS = Math.ceil(stepMs / 1000)

    // memoize since we call this server function in multiple server component leaf nodes, per request
    const res = await getTeamMetricsMemoized(
      session.access_token,
      teamId,
      startS,
      endS + overfetchS
    )

    if (res.error) {
      const status = res.response.status

      l.error(
        {
          key: 'get_team_metrics:infra_error',
          error: res.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            startDate: startDateMs,
            endDate: endDateMs,
          },
        },
        `Failed to get team metrics: ${res.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    const metrics = res.data.map((d) => ({
      concurrentSandboxes: d.concurrentSandboxes,
      sandboxStartRate: d.sandboxStartRate,
      timestamp: d.timestampUnix * 1000, // since javascript timestamps are in milliseconds, we want to convert the timestamp back to milliseconds
    }))

    return {
      metrics,
      step: stepMs,
    }
  })
