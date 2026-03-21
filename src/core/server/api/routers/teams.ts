import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { withAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedProcedure } from '@/core/server/trpc/procedures'

const teamsRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(createUserTeamsRepository, (teamsRepository) => ({
    teamsRepository,
  }))
)

export const teamsRouter = createTRPCRouter({
  list: teamsRepositoryProcedure.query(async ({ ctx }) => {
    const teamsResult = await ctx.teamsRepository.listUserTeams()

    if (!teamsResult.ok) {
      throwTRPCErrorFromRepoError(teamsResult.error)
    }

    return teamsResult.data
  }),
})
