import z from 'zod'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { protectedProcedure } from '@/core/server/trpc/procedures'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'

export const teamsRouter = {
  getCurrentTeam: protectedProcedure
    .input(z.object({ teamIdOrSlug: TeamIdOrSlugSchema }))
    .query(async ({ ctx, input }) => {
      const teamResult = await ctx.services.teams.getCurrentUserTeam(
        input.teamIdOrSlug
      )

      if (!teamResult.ok) {
        throwTRPCErrorFromRepoError(teamResult.error)
      }

      return teamResult.data
    }),
}
