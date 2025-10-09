import 'server-only'

import { MAX_DAYS_AGO } from '@/features/dashboard/sandboxes/monitoring/time-picker/constants'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { z } from 'zod'
import { getTeamMetricsCore } from './get-team-metrics-core'

export const GetTeamMetricsSchema = z
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

    const result = await getTeamMetricsCore({
      accessToken: session.access_token,
      teamId,
      userId: session.user.id,
      startMs: startDateMs,
      endMs: endDateMs,
    })

    if (result.error) {
      // error already logged in core function
      return returnServerError(result.error)
    }

    return result.data
  })
