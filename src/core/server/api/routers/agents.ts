import { resolveAgentTemplates } from '@/configs/agents'
import { FEATURE_FLAGS } from '@/configs/flags'
import { createAgentsRepository } from '@/core/modules/agents/repository.server'
import { featureFlags } from '@/core/server/feature-flags/flags.server'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'

export const agentsRouter = createTRPCRouter({
  getTemplates: protectedTeamProcedure.query(async ({ ctx }) => {
    const agentsRepository = createAgentsRepository({
      accessToken: ctx.session.access_token,
      teamId: ctx.teamId,
    })
    const agents = await agentsRepository.getAgents()

    if (agents.ok && agents.data.length) {
      return {
        templates: resolveAgentTemplates(agents.data),
      }
    }

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
