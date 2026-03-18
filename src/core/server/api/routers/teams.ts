import z from 'zod'
import { createUserTeamsRepository } from '@/core/domains/teams/user-teams-repository.server'
import { withAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { protectedProcedure } from '@/core/server/trpc/procedures'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'

const teamsRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(createUserTeamsRepository, (teamsRepository) => ({
    teamsRepository,
  }))
)

export const teamsRouter = {
  getCurrentTeam: teamsRepositoryProcedure
    .input(z.object({ teamIdOrSlug: TeamIdOrSlugSchema }))
    .query(async ({ ctx, input }) => {
      const teamResult = await ctx.teamsRepository.getCurrentUserTeam(
        input.teamIdOrSlug
      )

      if (!teamResult.ok) {
        throwTRPCErrorFromRepoError(teamResult.error)
      }

      return teamResult.data
    }),
}
