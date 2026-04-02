import 'server-only'

import { z } from 'zod'
import {
  authActionClient,
  withTeamSlugResolution,
} from '@/core/server/actions/client'
import { returnServerError } from '@/core/server/actions/utils'
import { getPublicErrorMessage } from '@/core/shared/errors'
import { TeamSlugSchema } from '@/core/shared/schemas/team'
import { MAX_DAYS_AGO } from '@/features/dashboard/sandboxes/monitoring/time-picker/constants'
import { getTeamMetricsCore } from './get-team-metrics-core'

export const GetTeamMetricsSchema = z
  .object({
    teamSlug: TeamSlugSchema,
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
  .use(withTeamSlugResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { session, teamId } = ctx

    const { startDate: startDateMs, endDate: endDateMs } = parsedInput

    const result = await getTeamMetricsCore({
      accessToken: session.access_token,
      teamId,
      userId: session.user.id,
      startMs: startDateMs,
      endMs: endDateMs,
    })

    if (result.error) {
      return returnServerError(
        getPublicErrorMessage({ status: result.status })
      )
    }

    return result.data
  })
