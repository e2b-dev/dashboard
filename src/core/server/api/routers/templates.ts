import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { createTRPCRouter } from '@/core/server/trpc/init'
import {
  protectedProcedure,
  protectedTeamProcedure,
} from '@/core/server/trpc/procedures'

export const templatesRouter = createTRPCRouter({
  // QUERIES

  getTemplates: protectedTeamProcedure.query(async ({ ctx }) => {
    const result = await ctx.services.templates.getTeamTemplates()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getDefaultTemplatesCached: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.services.templates.getDefaultTemplatesCached()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  // MUTATIONS

  deleteTemplate: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId } = input

      const result = await ctx.services.templates.deleteTemplate(templateId)

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

  updateTemplate: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
        public: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId, public: isPublic } = input

      const result = await ctx.services.templates.updateTemplateVisibility(
        templateId,
        isPublic
      )
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      return result.data
    }),
})
