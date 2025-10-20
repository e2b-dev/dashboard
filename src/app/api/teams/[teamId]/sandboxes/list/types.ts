import { SandboxWithMetrics } from '@/features/dashboard/sandboxes/list/table-config'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { z } from 'zod'

export const SandboxesListRequestSchema = z.object({
  teamId: TeamIdOrSlugSchema,
})

export type SandboxesListRequest = z.infer<typeof SandboxesListRequestSchema>

export type SandboxesListResponse = {
  sandboxes: SandboxWithMetrics[]
}
