import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import * as buildsRepo from '@/server/api/repositories/builds.repository'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { apiError } from '../errors'
import { createTRPCRouter } from '../init'
import {
  BuildStatusDTOSchema,
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
        {
          limit,
          cursor,
        }
      )
    }),

  latestBuildTimestamp: protectedTeamProcedure.query(async ({ ctx }) => {
    return await buildsRepo.getLatestBuildTimestamp(ctx.teamId)
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

  getBuildStatus: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
        buildId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session, teamId } = ctx
      const { templateId, buildId } = input

      const res = await infra.GET(
        '/templates/{templateID}/builds/{buildID}/status',
        {
          params: {
            path: {
              templateID: templateId,
              buildID: buildId,
            },
          },
          headers: {
            ...SUPABASE_AUTH_HEADERS(session.access_token),
          },
        }
      )

      if (!res.response.ok) {
        const status = res.response.status

        l.error(
          {
            key: 'trpc:builds:get_build_status:infra_error',
            error: res.error,
            user_id: session.user.id,
            team_id: teamId,
            template_id: templateId,
            build_id: buildId,
            context: {
              status,
              body: await res.response.text(),
            },
          },
          `Failed to get build status: ${res.error?.message || 'Unknown error'}`
        )

        if (status === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Build not found',
          })
        }

        throw apiError(status)
      }

      return res.data
    }),
})
