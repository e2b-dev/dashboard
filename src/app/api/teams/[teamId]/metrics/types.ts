import { MAX_DAYS_AGO } from '@/features/dashboard/sandboxes/monitoring/time-picker/constants'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { z } from 'zod'

export const TeamMetricsRequestSchema = z
  .object({
    start: z
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
    end: z
      .number()
      .int()
      .positive()
      .describe('Unix timestamp in milliseconds')
      .refine((end) => end <= Date.now(), {
        message: 'End date cannot be more than now',
      }),
  })
  .refine(
    (data) => {
      return data.end - data.start <= MAX_DAYS_AGO
    },
    {
      message: `Date range cannot exceed ${MAX_DAYS_AGO / (1000 * 60 * 60 * 24)} days`,
    }
  )

// TeamMetricsRequest type is inferred from schema when needed, no need to export

export type TeamMetricsResponse = {
  metrics: ClientTeamMetrics
  step: number
}
