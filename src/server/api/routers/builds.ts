import { buildsRepo } from '@/server/api/repositories/builds.repository'
import { z } from 'zod'
import { createTRPCRouter } from '../init'
import {
  BuildDetailsDTO,
  BuildLogDTO,
  BuildLogsDTO,
  BuildStatusDTOSchema,
  checkIfBuildStillHasLogs,
  mapBuildStatusDTOToDatabaseBuildStatus,
} from '../models/builds.models'
import { protectedTeamProcedure } from '../procedures'

export const buildsRouter = createTRPCRouter({
  // QUERIES

  list: protectedTeamProcedure
    .input(
      z.object({
        buildIdOrTemplate: z.string().optional(),
        statuses: z.array(BuildStatusDTOSchema),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = ctx
      const { buildIdOrTemplate, statuses, limit, cursor } = input

      const dbStatuses = statuses.flatMap(
        mapBuildStatusDTOToDatabaseBuildStatus
      )

      return await buildsRepo.listBuilds(
        teamId,
        buildIdOrTemplate,
        dbStatuses,
        { limit, cursor }
      )
    }),

  runningStatuses: protectedTeamProcedure
    .input(
      z.object({
        buildIds: z.array(z.string()).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = ctx
      const { buildIds } = input

      return await buildsRepo.getRunningStatuses(teamId, buildIds)
    }),

  buildDetails: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
        buildId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = ctx
      const { buildId, templateId } = input

      const buildInfo = await buildsRepo.getBuildInfo(buildId, teamId)

      const result: BuildDetailsDTO = {
        template: buildInfo.alias ?? templateId,
        startedAt: buildInfo.createdAt,
        finishedAt: buildInfo.finishedAt,
        status: buildInfo.status,
        statusMessage: buildInfo.statusMessage,
        hasRetainedLogs: checkIfBuildStillHasLogs(buildInfo.createdAt),
      }

      return result
    }),

  buildLogsBackwards: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
        buildId: z.string(),
        cursor: z.number().optional(),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = ctx
      const { buildId, templateId, level } = input
      let { cursor } = input

      cursor ??= new Date().getTime()

      const direction = 'backward'
      const limit = 100

      const buildLogs = await buildsRepo.getInfraBuildLogs(
        ctx.session.access_token,
        teamId,
        templateId,
        buildId,
        { cursor, limit, direction, level }
      )

      const logs: BuildLogDTO[] = buildLogs.logs
        .map((log) => ({
          timestampUnix: new Date(log.timestamp).getTime(),
          level: log.level,
          message: log.message,
        }))
        .sort((a, b) => a.timestampUnix - b.timestampUnix)

      const hasMore = logs.length === limit
      const cursorLog = logs[0]
      const nextCursor = hasMore ? (cursorLog?.timestampUnix ?? null) : null

      const result: BuildLogsDTO = {
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
      const { teamId } = ctx
      const { buildId, templateId, level } = input
      let { cursor } = input

      cursor ??= new Date().getTime()

      const direction = 'forward'
      const limit = 100

      const buildLogs = await buildsRepo.getInfraBuildLogs(
        ctx.session.access_token,
        teamId,
        templateId,
        buildId,
        { cursor, limit, direction, level }
      )

      const logs: BuildLogDTO[] = buildLogs.logs
        .map((log) => ({
          timestampUnix: new Date(log.timestamp).getTime(),
          level: log.level,
          message: log.message,
        }))
        .sort((a, b) => a.timestampUnix - b.timestampUnix)

      const newestLog = logs[logs.length - 1]
      const nextCursor = newestLog?.timestampUnix ?? cursor

      const result: BuildLogsDTO = {
        logs,
        nextCursor,
      }

      return result
    }),
})
