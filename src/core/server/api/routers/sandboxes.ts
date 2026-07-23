import { z } from 'zod'
import { createSandboxesRepository } from '@/core/modules/sandboxes/repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/errors'
import { withAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import { transformMetricsToClientMetrics } from '@/core/server/functions/sandboxes/utils'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedProcedure } from '@/core/server/trpc/procedures'

const sandboxesRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(
    createSandboxesRepository,
    (sandboxesRepository) => ({
      sandboxesRepository,
    })
  )
)

export const sandboxesRouter = createTRPCRouter({
  // QUERIES
  listSandboxesPaginated: sandboxesRepositoryProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        states: z.array(z.enum(['running', 'paused'])).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sandboxesResult =
        await ctx.sandboxesRepository.listSandboxesPaginated({
          cursor: input.cursor,
          limit: input.limit,
          states: input.states,
        })
      if (!sandboxesResult.ok) {
        throwTRPCErrorFromRepoError(sandboxesResult.error)
      }

      return {
        sandboxes: sandboxesResult.data.sandboxes,
        nextCursor: sandboxesResult.data.nextCursor,
      }
    }),

  getSandboxesMetrics: sandboxesRepositoryProcedure
    .input(
      z.object({
        sandboxIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxIds } = input

      if (sandboxIds.length === 0) {
        return {
          metrics: {},
        }
      }

      const metricsDataResult =
        await ctx.sandboxesRepository.getSandboxesMetrics(sandboxIds)
      if (!metricsDataResult.ok) {
        throwTRPCErrorFromRepoError(metricsDataResult.error)
      }
      const metricsData = metricsDataResult.data
      const metrics = transformMetricsToClientMetrics(metricsData)

      return {
        metrics,
      }
    }),

  // MUTATIONS
})
