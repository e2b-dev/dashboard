import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { z } from 'zod'

export const TeamMetricsRequestSchema = z.object({
  start: z
    .number()
    .int()
    .positive()
    .min(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .describe('Unix timestamp in milliseconds'),
  end: z
    .number()
    .int()
    .positive()
    .max(Date.now() + 60 * 1000)
    .describe('Unix timestamp in milliseconds'),
})

export type TeamMetricsRequest = z.infer<typeof TeamMetricsRequestSchema>

export type TeamMetricsResponse = {
  metrics: ClientTeamMetrics
  step: number
}
