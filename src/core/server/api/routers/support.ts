import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createSupportRepository } from '@/core/domains/support/repository.server'
import { withTeamAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'

const E2B_API_KEY_REGEX = /e2b_[a-f0-9]{40}/i

const fileSchema = z.object({
  name: z.string(),
  type: z.string(),
  base64: z.string(),
})

const supportRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(createSupportRepository, (supportRepository) => ({
    supportRepository,
  }))
)

export const supportRouter = createTRPCRouter({
  contactSupport: supportRepositoryProcedure
    .input(
      z.object({
        description: z.string().min(1),
        files: z.array(fileSchema).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, user } = ctx
      const email = user.email

      if (!email) {
        throw new Error('Email not found')
      }

      if (E2B_API_KEY_REGEX.test(input.description)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Your message contains an API key. Please remove it before sending.',
        })
      }

      const teamResult = await ctx.supportRepository.getTeamSupportData()
      if (!teamResult.ok) {
        throwTRPCErrorFromRepoError(teamResult.error)
      }

      const createResult = await ctx.supportRepository.createSupportThread({
        description: input.description,
        files: input.files,
        teamId,
        teamName: teamResult.data.name,
        customerEmail: email,
        accountOwnerEmail: teamResult.data.email,
        customerTier: teamResult.data.tier,
      })
      if (!createResult.ok) {
        throwTRPCErrorFromRepoError(createResult.error)
      }

      return createResult.data
    }),
})
