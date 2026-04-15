import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { CACHE_TAGS } from '@/configs/cache'
import { createKeysRepository } from '@/core/modules/keys/repository.server'
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

const teamsRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(createUserTeamsRepository, (teamsRepository) => ({
    teamsRepository,
  }))
)

const keysRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(createKeysRepository, (keysRepository) => ({
    keysRepository,
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

  listApiKeys: keysRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.keysRepository.listTeamApiKeys()

    if (!result.ok) {
      throwTRPCErrorFromRepoError(result.error)
    }

    return { apiKeys: result.data }
  }),

  createApiKey: keysRepositoryProcedure
    .input(
      z.object({
        name: z
          .string({ error: 'Name is required' })
          .min(1, 'Name cannot be empty')
          .max(50, 'Name cannot be longer than 50 characters')
          .trim(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, teamSlug } = input

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

      revalidateTag(CACHE_TAGS.TEAM_API_KEYS(ctx.teamId), 'default')
      revalidatePath(`/dashboard/${teamSlug}/keys`, 'page')

      return { createdApiKey: result.data }
    }),

  deleteApiKey: keysRepositoryProcedure
    .input(
      z.object({
        apiKeyId: z.uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { apiKeyId, teamSlug } = input

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

      revalidateTag(CACHE_TAGS.TEAM_API_KEYS(ctx.teamId), 'default')
      revalidatePath(`/dashboard/${teamSlug}/keys`, 'page')
    }),
})
