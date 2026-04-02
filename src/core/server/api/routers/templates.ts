import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import {
  createDefaultTemplatesRepository,
  createTemplatesRepository,
} from '@/core/modules/templates/repository.server'
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

const templatesRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(
    createDefaultTemplatesRepository,
    (templatesRepository) => ({
      templatesRepository,
    })
  )
)

const teamTemplatesRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(
    createTemplatesRepository,
    (templatesRepository) => ({
      templatesRepository,
    })
  )
)

export const templatesRouter = createTRPCRouter({
  // QUERIES

  getTemplates: teamTemplatesRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.templatesRepository.getTeamTemplates()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getDefaultTemplatesCached: templatesRepositoryProcedure.query(
    async ({ ctx }) => {
      const result = await ctx.templatesRepository.getDefaultTemplatesCached()
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
      return result.data
    }
  ),

  // MUTATIONS

  deleteTemplate: teamTemplatesRepositoryProcedure
    .input(
      z.object({
        templateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId } = input

      const result = await ctx.templatesRepository.deleteTemplate(templateId)

      if (!result.ok) {
        if (
          result.error.status === 400 &&
          result.error.message.includes(
            'because there are paused sandboxes using it'
          )
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Cannot delete template because there are paused sandboxes using it',
          })
        }
        throwTRPCErrorFromRepoError(result.error)
      }

      return result.data
    }),

  updateTemplate: teamTemplatesRepositoryProcedure
    .input(
      z.object({
        templateId: z.string(),
        public: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId, public: isPublic } = input

      const result = await ctx.templatesRepository.updateTemplateVisibility(
        templateId,
        isPublic
      )
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      return result.data
    }),
})
