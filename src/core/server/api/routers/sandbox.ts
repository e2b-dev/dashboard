import { millisecondsInDay } from 'date-fns/constants'
import { z } from 'zod'
import {
  deriveSandboxLifecycleFromEvents,
  mapApiSandboxRecordToModel,
  mapInfraSandboxDetailsToModel,
  mapInfraSandboxLogToModel,
  type SandboxDetailsModel,
  type SandboxLogModel,
  type SandboxLogsModel,
} from '@/core/domains/sandboxes/models'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import { SANDBOX_MONITORING_METRICS_RETENTION_MS } from '@/features/dashboard/sandbox/monitoring/utils/constants'
import { SandboxIdSchema } from '@/lib/schemas/api'

export const sandboxRouter = createTRPCRouter({
  // QUERIES

  details: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId } = input

      const detailsResult =
        await ctx.services.sandboxes.getSandboxDetails(sandboxId)

      const mappedDetails: SandboxDetailsModel =
        detailsResult.source === 'infra'
          ? mapInfraSandboxDetailsToModel(detailsResult.details)
          : mapApiSandboxRecordToModel(detailsResult.details)

      const lifecycleEvents =
        await ctx.services.sandboxes.getSandboxLifecycleEvents(sandboxId)
      const derivedLifecycle = deriveSandboxLifecycleFromEvents(lifecycleEvents)
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

  logsBackwardsReversed: protectedTeamProcedure
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

      const sandboxLogs = await ctx.services.sandboxes.getSandboxLogs(
        sandboxId,
        { cursor, limit, direction, level, search }
      )

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

  logsForward: protectedTeamProcedure
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

      const sandboxLogs = await ctx.services.sandboxes.getSandboxLogs(
        sandboxId,
        { cursor, limit, direction, level, search }
      )

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

  resourceMetrics: protectedTeamProcedure
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

      const metrics = await ctx.services.sandboxes.getSandboxMetrics(
        sandboxId,
        {
          startUnixMs: startMs,
          endUnixMs: endMs,
        }
      )

      return metrics
    }),

  // MUTATIONS
})
