import * as buildsRepo from '@/server/api/repositories/builds.repository'
import { z } from 'zod'
import { createTRPCRouter } from '../init'
import {
  BuildDetailsDTO,
  BuildLogDTO,
  BuildStatusDTOSchema,
  checkIfBuildStillHasLogs,
  mapBuildStatusDTOToDatabaseBuildStatus,
  mapInfraBuildStatusToBuildStatusDTO,
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

      const [buildInfo, buildStatus] = await Promise.all([
        buildsRepo.getBuildInfo(buildId, teamId),
        buildsRepo.getInfraBuildStatus(
          ctx.session.access_token,
          teamId,
          templateId,
          buildId
        ),
      ])

      const firstLogTimestamp =
        buildStatus.logEntries.length > 0
          ? buildStatus.logEntries.reduce<number | null>((min, log) => {
              const timestamp = new Date(log.timestamp).getTime()
              if (Number.isNaN(timestamp)) return min
              return min === null || timestamp < min ? timestamp : min
            }, null)
          : null

      const startedAt = firstLogTimestamp ?? buildInfo.createdAt

      const logs: BuildLogDTO[] = buildStatus.logEntries.map((log) => {
        const timestampUnix = new Date(log.timestamp).getTime()

        return {
          timestampUnix,
          millisAfterStart: timestampUnix - startedAt,
          level: log.level,
          message: log.message,
        }
      })

      const result: BuildDetailsDTO = {
        template: buildInfo.alias ?? templateId,
        startedAt,
        finishedAt: buildInfo.finishedAt,
        status: mapInfraBuildStatusToBuildStatusDTO(buildStatus.status),
        statusMessage: buildStatus.reason?.message ?? null,
        hasRetainedLogs: checkIfBuildStillHasLogs(buildInfo.createdAt),
        logs,
      }

      return result
    }),
})
