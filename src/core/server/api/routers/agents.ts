import { resolveAgentTemplates } from '@/configs/agents'
import { FEATURE_FLAGS } from '@/configs/flags'
import { featureFlags } from '@/core/server/feature-flags/flags.server'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'

export const agentsRouter = createTRPCRouter({
  getTemplates: protectedTeamProcedure.query(async ({ ctx }) => {
    const templates = await featureFlags.getJson(FEATURE_FLAGS.agentTemplates, {
      userId: ctx.session.user.id,
      teamId: ctx.teamId,
    })

    return {
      templates: resolveAgentTemplates(
        templates.length ? templates : undefined
      ),
    }
  }),
})
