import { SandboxIdSchema } from '@/lib/schemas/api'
import { z } from 'zod'
import { createTRPCRouter } from '../init'
import {
  mapInfraSandboxLogToDTO,
  SandboxLogDTO,
  SandboxLogsDTO,
} from '../models/sandboxes.models'
import { protectedTeamProcedure } from '../procedures'
import { sandboxesRepo } from '../repositories/sandboxes.repository'

export const sandboxRouter = createTRPCRouter({
  // QUERIES

  logsBackwardsReversed: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        cursor: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, session } = ctx
      const { sandboxId } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'backward'
      const limit = 100

      const sandboxLogs = await sandboxesRepo.getSandboxLogs(
        session.access_token,
        teamId,
        sandboxId,
        { cursor, limit, direction }
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
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, session } = ctx
      const { sandboxId } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'forward'
      const limit = 100

      const sandboxLogs = await sandboxesRepo.getSandboxLogs(
        session.access_token,
        teamId,
        sandboxId,
        { cursor, limit, direction }
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
      z.object({
        sandboxId: SandboxIdSchema,
        startMs: z.number(),
        endMs: z.number(),
      })
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

      return {
        metrics,
      }
    }),

  // MUTATIONS
})
