import { z } from 'zod'
import type { ClientSandboxesMetrics } from '@/core/domains/sandboxes/models.client'

export const MetricsRequestSchema = z.object({
  sandboxIds: z.array(z.string()).min(1, 'Provide at least one sandbox id'),
})

export type MetricsRequest = z.infer<typeof MetricsRequestSchema>

export type MetricsResponse = {
  metrics: ClientSandboxesMetrics
}
