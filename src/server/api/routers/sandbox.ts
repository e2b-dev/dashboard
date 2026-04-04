import { millisecondsInDay } from 'date-fns/constants'
import { z } from 'zod'
import { SANDBOX_MONITORING_METRICS_RETENTION_MS } from '@/features/dashboard/sandbox/monitoring/utils/constants'
import { SandboxIdSchema } from '@/lib/schemas/api'
import { createTRPCRouter } from '../init'
import {
  deriveSandboxLifecycleFromEvents,
  mapApiSandboxRecordToDTO,
  mapInfraSandboxDetailsToDTO,
  mapInfraSandboxLogToDTO,
  type SandboxDetailsDTO,
  type SandboxLogDTO,
  type SandboxLogsDTO,
} from '../models/sandboxes.models'
import { protectedTeamProcedure } from '../procedures'
import { sandboxesRepo } from '../repositories/sandboxes.repository'

export const sandboxRouter = createTRPCRouter({
  // QUERIES

  details: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, session } = ctx
      const { sandboxId } = input

      const detailsResult = await sandboxesRepo.getSandboxDetails(
        session.access_token,
        teamId,
        sandboxId
      )

      const mappedDetails: SandboxDetailsDTO =
        detailsResult.source === 'infra'
          ? mapInfraSandboxDetailsToDTO(detailsResult.details)
          : mapApiSandboxRecordToDTO(detailsResult.details)

      const lifecycleEvents = await sandboxesRepo.getSandboxLifecycleEvents(
        session.access_token,
        teamId,
        sandboxId
      )
      const derivedLifecycle = deriveSandboxLifecycleFromEvents(lifecycleEvents)
      const fallbackEndedAt =
        mappedDetails.state === 'killed'
          ? (mappedDetails.stoppedAt ?? mappedDetails.endAt)
          : null

      return {
        ...mappedDetails,
        lifecycle: {
          createdAt: derivedLifecycle.createdAt ?? mappedDetails.startedAt,
          pausedAt: derivedLifecycle.pausedAt,
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
      const { teamId, session } = ctx
      const { sandboxId, level, search } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'backward'
      const limit = 100

      const sandboxLogs = await sandboxesRepo.getSandboxLogs(
        session.access_token,
        teamId,
        sandboxId,
        { cursor, limit, direction, level, search }
      )

      const logs: SandboxLogDTO[] = sandboxLogs.logs
        .map(mapInfraSandboxLogToDTO)
        .reverse()

      const hasMore = logs.length === limit
      const cursorLog = logs[0]
      const nextCursor = hasMore ? (cursorLog?.timestampUnix ?? null) : null

      const result: SandboxLogsDTO = {
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
      const { teamId, session } = ctx
      const { sandboxId, level, search } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'forward'
      const limit = 100

      const sandboxLogs = await sandboxesRepo.getSandboxLogs(
        session.access_token,
        teamId,
        sandboxId,
        { cursor, limit, direction, level, search }
      )

      const logs: SandboxLogDTO[] = sandboxLogs.logs.map(
        mapInfraSandboxLogToDTO
      )

      const newestLog = logs[logs.length - 1]
      const nextCursor = newestLog?.timestampUnix ?? cursor

      const result: SandboxLogsDTO = {
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
      const { teamId, session } = ctx
      const { sandboxId } = input
      const { startMs, endMs } = input

      const metrics = await sandboxesRepo.getSandboxMetrics(
        session.access_token,
        teamId,
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
