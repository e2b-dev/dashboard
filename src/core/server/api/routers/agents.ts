import { getAgentTemplates } from '@/configs/agents'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'

export const agentsRouter = createTRPCRouter({
  getTemplates: protectedTeamProcedure.query(() => ({
    templates: getAgentTemplates(),
  })),
})
