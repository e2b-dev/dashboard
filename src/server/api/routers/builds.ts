import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import * as buildsRepo from '@/server/api/repositories/builds.repository'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { apiError } from '../errors'
import { createTRPCRouter } from '../init'
import {
  type BuildStatusDB,
  BuildStatusSchema,
  mapBuildStatusDTO,
} from '../models/builds.models'
import { protectedTeamProcedure } from '../procedures'

export const buildsRouter = createTRPCRouter({
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
      const { teamId } = ctx
      const { buildIdOrTemplate, statuses, limit, cursor } = input

      const dbStatuses = statuses.flatMap(mapBuildStatusDTO) as BuildStatusDB[]

      try {
        return await buildsRepo.listBuilds(teamId, buildIdOrTemplate, dbStatuses, {
          limit,
          cursor,
        })
      } catch (error) {
        l.error(
          {
            key: 'trpc:builds:list:error',
            error,
            team_id: teamId,
            context: {
              build_id_or_template: buildIdOrTemplate,
              statuses,
              db_statuses: dbStatuses,
            },
          },
          `Failed to list builds: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch builds',
        })
      }
    }),

  getStatuses: protectedTeamProcedure
    .input(
      z.object({
        buildIds: z.array(z.string()).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = ctx
      const { buildIds } = input

      try {
        const statuses = await buildsRepo.getBuildStatuses(teamId, buildIds)
        return { statuses }
      } catch (error) {
        l.error(
          {
            key: 'trpc:builds:get_statuses:error',
            error,
            team_id: teamId,
            build_ids: buildIds,
          },
          `Failed to get build statuses: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch build statuses',
        })
      }
    }),
})
