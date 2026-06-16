import { getAgentTemplates } from '@/configs/agents'
import { FEATURE_FLAGS } from '@/configs/flags'
import { forbiddenTeamAccessError } from '@/core/server/adapters/errors'
import { featureFlags } from '@/core/server/feature-flags/flags.server'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'

export const agentsRouter = createTRPCRouter({
  getTemplates: protectedTeamProcedure.query(async ({ ctx }) => {
    const isEnabled = await featureFlags.getBoolean(
      FEATURE_FLAGS.agentsEnabled,
      {
        userId: ctx.session.user.id,
        teamId: ctx.teamId,
      }
    )

    if (!isEnabled) {
      throw forbiddenTeamAccessError()
    }

    return {
      templates: getAgentTemplates(),
    }
  }),
})
