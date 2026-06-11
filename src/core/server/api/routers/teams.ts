import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createKeysRepository } from '@/core/modules/keys/repository.server'
import { CreateApiKeySchema } from '@/core/modules/keys/schemas'
import {
  AddTeamMemberSchema,
  CreateTeamSchema,
  RemoveTeamMemberSchema,
  TeamNameSchema,
} from '@/core/modules/teams/schemas'
import { createTeamsRepository } from '@/core/modules/teams/teams-repository.server'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/errors'
import {
  withAuthedRequestRepository,
  withTeamAuthedRequestRepository,
} from '@/core/server/api/middlewares/repository'
import { createTRPCRouter } from '@/core/server/trpc/init'
import {
  protectedProcedure,
  protectedTeamProcedure,
} from '@/core/server/trpc/procedures'
import { l } from '@/core/shared/clients/logger/logger'

const userTeamsRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(
    createUserTeamsRepository,
    (userTeamsRepository) => ({
      userTeamsRepository,
    })
  )
)

const teamsRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(createTeamsRepository, (teamsRepository) => ({
    teamsRepository,
  }))
)

const keysRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(createKeysRepository, (keysRepository) => ({
    keysRepository,
  }))
)

export const teamsRouter = createTRPCRouter({
  list: userTeamsRepositoryProcedure.query(async ({ ctx }) => {
    const teamsResult = await ctx.userTeamsRepository.listUserTeams()

    if (!teamsResult.ok) {
      throwTRPCErrorFromRepoError(teamsResult.error)
    }

    return teamsResult.data
  }),

  listApiKeys: keysRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.keysRepository.listTeamApiKeys()

    if (!result.ok) {
      throwTRPCErrorFromRepoError(result.error)
    }

    return { apiKeys: result.data }
  }),

  createApiKey: keysRepositoryProcedure
    .input(CreateApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const { name } = input

      const result = await ctx.keysRepository.createApiKey(name)

      if (!result.ok) {
        l.error({
          key: 'create_api_key_trpc:error',
          message: result.error.message,
          error: result.error,
          team_id: ctx.teamId,
          user_id: ctx.session.user.id,
          context: { name },
        })

        throwTRPCErrorFromRepoError(result.error)
      }

      return { createdApiKey: result.data }
    }),

  deleteApiKey: keysRepositoryProcedure
    .input(
      z.object({
        apiKeyId: z.uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { apiKeyId } = input

      const result = await ctx.keysRepository.deleteApiKey(apiKeyId)

      if (!result.ok) {
        l.error({
          key: 'delete_api_key_trpc:error',
          message: result.error.message,
          error: result.error,
          team_id: ctx.teamId,
          user_id: ctx.session.user.id,
          context: { apiKeyId },
        })

        throwTRPCErrorFromRepoError(result.error)
      }

      return undefined
    }),

  create: userTeamsRepositoryProcedure
    .input(CreateTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.userTeamsRepository.createTeam(input.name)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      return result.data
    }),
  members: teamsRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.teamsRepository.listTeamMembers()

    if (!result.ok) throwTRPCErrorFromRepoError(result.error)

    return result.data
  }),
  updateName: teamsRepositoryProcedure
    .input(
      z.object({
        name: TeamNameSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.teamsRepository.updateTeamName(input.name)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      revalidatePath(`/dashboard/${input.teamSlug}/general`, 'page')

      return result.data
    }),
  addMember: teamsRepositoryProcedure
    .input(AddTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.teamsRepository.addTeamMember(input.email)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      revalidatePath(`/dashboard/${input.teamSlug}/members`, 'page')
    }),
  removeMember: teamsRepositoryProcedure
    .input(RemoveTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.teamsRepository.removeTeamMember(input.userId)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      revalidatePath(`/dashboard/${input.teamSlug}/members`, 'page')
    }),

})
