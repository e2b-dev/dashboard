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
          const maxDaysAgo = 31 * 24 * 60 * 60 * 1000 // 31 days in ms
          return start >= now - maxDaysAgo
        },
        { message: 'Start date cannot be more than 31 days ago' }
      ),
    end: z
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
      return data.end - data.start <= maxSpanMs
    },
    { message: 'Date range cannot exceed 31 days' }
  )

// TeamMetricsRequest type is inferred from schema when needed, no need to export

export type TeamMetricsResponse = {
  metrics: ClientTeamMetrics
  step: number
}
