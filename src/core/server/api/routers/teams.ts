import { CreateTeamSchema } from '@/core/modules/teams/schemas'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/errors'
import { withAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedProcedure } from '@/core/server/trpc/procedures'

const userTeamsRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(
    createUserTeamsRepository,
    (userTeamsRepository) => ({
      userTeamsRepository,
    })
  )
)

export const teamsRouter = createTRPCRouter({
  list: userTeamsRepositoryProcedure.query(async ({ ctx }) => {
    const teamsResult = await ctx.userTeamsRepository.listUserTeams()

    if (!teamsResult.ok) {
      throwTRPCErrorFromRepoError(teamsResult.error)
    }

    return teamsResult.data
  }),

  create: userTeamsRepositoryProcedure
    .input(CreateTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.userTeamsRepository.createTeam(input.name)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      return result.data
    }),
})
