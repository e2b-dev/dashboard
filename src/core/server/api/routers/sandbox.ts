import { millisecondsInDay } from 'date-fns/constants'
import { z } from 'zod'
import { createSandboxesRepository } from '@/core/domains/sandboxes/repository.server'
import { withTeamAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import {
  deriveSandboxLifecycleFromEvents,
  mapApiSandboxRecordToModel,
  mapInfraSandboxDetailsToModel,
  mapInfraSandboxLogToModel,
  type SandboxDetailsModel,
  type SandboxLogModel,
  type SandboxLogsModel,
} from '@/core/domains/sandboxes/models'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import { SANDBOX_MONITORING_METRICS_RETENTION_MS } from '@/features/dashboard/sandbox/monitoring/utils/constants'
import { SandboxIdSchema } from '@/lib/schemas/api'

const sandboxRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(
    createSandboxesRepository,
    (sandboxesRepository) => ({
    sandboxesRepository,
    })
  )
)

export const sandboxRouter = createTRPCRouter({
  // QUERIES

  details: sandboxRepositoryProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId } = input

      const detailsResult =
        await ctx.sandboxesRepository.getSandboxDetails(sandboxId)
      if (!detailsResult.ok) {
        throwTRPCErrorFromRepoError(detailsResult.error)
      }

      const mappedDetails: SandboxDetailsModel =
        detailsResult.data.source === 'infra'
          ? mapInfraSandboxDetailsToModel(detailsResult.data.details)
          : mapApiSandboxRecordToModel(detailsResult.data.details)

      const lifecycleEventsResult =
        await ctx.sandboxesRepository.getSandboxLifecycleEvents(sandboxId)
      if (!lifecycleEventsResult.ok) {
        throwTRPCErrorFromRepoError(lifecycleEventsResult.error)
      }
      const derivedLifecycle = deriveSandboxLifecycleFromEvents(
        lifecycleEventsResult.data
      )
      const fallbackPausedAt =
        mappedDetails.state === 'paused' ? mappedDetails.endAt : null
      const fallbackEndedAt =
        mappedDetails.state === 'killed'
          ? (mappedDetails.stoppedAt ?? mappedDetails.endAt)
          : null

      return {
        ...mappedDetails,
        lifecycle: {
          createdAt: derivedLifecycle.createdAt ?? mappedDetails.startedAt,
          pausedAt: derivedLifecycle.pausedAt ?? fallbackPausedAt,
          endedAt: derivedLifecycle.endedAt ?? fallbackEndedAt,
          events: derivedLifecycle.events,
        },
      }
    }),

  logsBackwardsReversed: sandboxRepositoryProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        cursor: z.number().optional(),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
        search: z.string().max(256).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId, level, search } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'backward'
      const limit = 100

      const sandboxLogsResult = await ctx.sandboxesRepository.getSandboxLogs(
        sandboxId,
        { cursor, limit, direction, level, search }
      )
      if (!sandboxLogsResult.ok) {
        throwTRPCErrorFromRepoError(sandboxLogsResult.error)
      }
      const sandboxLogs = sandboxLogsResult.data

      const logs: SandboxLogModel[] = sandboxLogs.logs
        .map(mapInfraSandboxLogToModel)
        .reverse()

      const hasMore = logs.length === limit
      const cursorLog = logs[0]
      const nextCursor = hasMore ? (cursorLog?.timestampUnix ?? null) : null

      const result: SandboxLogsModel = {
        logs,
        nextCursor,
      }

      return result
    }),

  logsForward: sandboxRepositoryProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        cursor: z.number().optional(),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
        search: z.string().max(256).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId, level, search } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'forward'
      const limit = 100

      const sandboxLogsResult = await ctx.sandboxesRepository.getSandboxLogs(
        sandboxId,
        { cursor, limit, direction, level, search }
      )
      if (!sandboxLogsResult.ok) {
        throwTRPCErrorFromRepoError(sandboxLogsResult.error)
      }
      const sandboxLogs = sandboxLogsResult.data

      const logs: SandboxLogModel[] = sandboxLogs.logs.map(
        mapInfraSandboxLogToModel
      )

      const newestLog = logs[logs.length - 1]
      const nextCursor = newestLog?.timestampUnix ?? cursor

      const result: SandboxLogsModel = {
        logs,
        nextCursor,
      }

      return result
    }),

  resourceMetrics: sandboxRepositoryProcedure
    .input(
      z
        .object({
          sandboxId: SandboxIdSchema,
          startMs: z.number().int().positive(),
          endMs: z.number().int().positive(),
        })
        .refine(({ startMs, endMs }) => startMs < endMs, {
          message: 'startMs must be before endMs',
        })
        .refine(
          ({ startMs, endMs }) => {
            const now = Date.now()
            return (
              startMs >= now - SANDBOX_MONITORING_METRICS_RETENTION_MS &&
              endMs <= now + millisecondsInDay
            )
          },
          {
            message:
              'Time range must be within metrics retention window (7 days) and 1 day from now',
          }
        )
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId } = input
      const { startMs, endMs } = input

      const metricsResult = await ctx.sandboxesRepository.getSandboxMetrics(
        sandboxId,
        {
          startUnixMs: startMs,
          endUnixMs: endMs,
        }
      )
      if (!metricsResult.ok) {
        throwTRPCErrorFromRepoError(metricsResult.error)
      }
      const metrics = metricsResult.data

      return metrics
    }),

  // MUTATIONS
})
