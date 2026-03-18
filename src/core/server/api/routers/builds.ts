import { z } from 'zod'
import {
  type BuildDetailsModel,
  type BuildLogModel,
  type BuildLogsModel,
  BuildStatusSchema,
} from '@/core/domains/builds/models'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import { LOG_RETENTION_MS } from '@/features/dashboard/templates/builds/constants'

export const buildsRouter = createTRPCRouter({
  // QUERIES

  list: protectedTeamProcedure
    .input(
      z.object({
        buildIdOrTemplate: z.string().optional(),
        statuses: z.array(BuildStatusSchema),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { buildIdOrTemplate, statuses, limit, cursor } = input

      return await ctx.services.builds.listBuilds(buildIdOrTemplate, statuses, {
        limit,
        cursor,
      })
    }),

  runningStatuses: protectedTeamProcedure
    .input(
      z.object({
        buildIds: z.array(z.string()).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { buildIds } = input

      return await ctx.services.builds.getRunningStatuses(buildIds)
    }),

  buildDetails: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
        buildId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { buildId, templateId } = input

      const buildInfo = await ctx.services.builds.getBuildInfo(buildId)

      const result: BuildDetailsModel = {
        templateNames: buildInfo.names,
        template: buildInfo.names?.[0] ?? templateId,
        startedAt: buildInfo.createdAt,
        finishedAt: buildInfo.finishedAt,
        status: buildInfo.status,
        statusMessage: buildInfo.statusMessage,
        hasRetainedLogs: checkIfBuildStillHasLogs(buildInfo.createdAt),
      }

      return result
    }),

  buildLogsBackwardsReversed: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
        buildId: z.string(),
        cursor: z.number().optional(),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { buildId, templateId, level } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'backward'
      const limit = 100

      const buildLogs = await ctx.services.builds.getInfraBuildLogs(
        templateId,
        buildId,
        { cursor, limit, direction, level }
      )

      const logs: BuildLogModel[] = buildLogs.logs
        .map((log) => ({
          timestampUnix: new Date(log.timestamp).getTime(),
          level: log.level,
          message: log.message,
        }))
        .reverse()

      const hasMore = logs.length === limit
      const cursorLog = logs[0]
      const nextCursor = hasMore ? (cursorLog?.timestampUnix ?? null) : null

      const result: BuildLogsModel = {
        logs,
        nextCursor,
      }

      return result
    }),

  buildLogsForward: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
        buildId: z.string(),
        cursor: z.number().optional(),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { buildId, templateId, level } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'forward'
      const limit = 100

      const buildLogs = await ctx.services.builds.getInfraBuildLogs(
        templateId,
        buildId,
        { cursor, limit, direction, level }
      )

      const logs: BuildLogModel[] = buildLogs.logs.map(
        (log: {
          timestamp: string
          level: BuildLogModel['level']
          message: string
        }) => ({
          timestampUnix: new Date(log.timestamp).getTime(),
          level: log.level,
          message: log.message,
        })
      )

      const newestLog = logs[logs.length - 1]
      const nextCursor = newestLog?.timestampUnix ?? cursor

      const result: BuildLogsModel = {
        logs,
        nextCursor,
      }

      return result
    }),
})

function checkIfBuildStillHasLogs(createdAt: number): boolean {
  return Date.now() - createdAt < LOG_RETENTION_MS
}
