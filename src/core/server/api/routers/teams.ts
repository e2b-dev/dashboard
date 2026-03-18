import { createUserTeamsRepository } from '@/core/domains/teams/user-teams-repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { withAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import { protectedProcedure } from '@/core/server/trpc/procedures'

const teamsRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(createUserTeamsRepository, (teamsRepository) => ({
    teamsRepository,
  }))
)

export const teamsRouter = {
  list: teamsRepositoryProcedure.query(async ({ ctx }) => {
    const teamsResult = await ctx.teamsRepository.listUserTeams()

    if (!teamsResult.ok) {
      throwTRPCErrorFromRepoError(teamsResult.error)
    }

    return teamsResult.data
  }),
}
