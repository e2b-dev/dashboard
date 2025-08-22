import { InferSafeActionFnResult } from 'next-safe-action'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { z } from 'zod'

export const TeamMetricsRequestSchema = z.object({
  start: z.number().int().positive().describe('Unix timestamp in milliseconds'),
  end: z.number().int().positive().describe('Unix timestamp in milliseconds'),
})

export type TeamMetricsRequest = z.infer<typeof TeamMetricsRequestSchema>

export type TeamMetricsResponse = {
  metrics: InferSafeActionFnResult<typeof getTeamMetrics>['data']
}
