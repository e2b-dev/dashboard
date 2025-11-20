import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import * as buildsRepo from '@/server/api/repositories/builds.repository'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { apiError } from '../errors'
import { createTRPCRouter } from '../init'
import { protectedTeamProcedure } from '../procedures'

export const buildsRouter = createTRPCRouter({
  // QUERIES

  getBuildStatus: protectedTeamProcedure
    .input(
      z.object({
        templateid: z.string(),
        buildId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session, teamId } = ctx
      const { buildId } = input

      const res = await infra.GET(
        '/templates/{templateID}/builds/{buildID}/status',
        {
          params: {
            path: {
              templateID: teamId,
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

  getRunningBuilds: protectedTeamProcedure
    .input(
      z.object({
        templateIdOrAlias: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = ctx
      const { templateIdOrAlias } = input

      try {
        const builds = await buildsRepo.getRunningBuilds(
          teamId,
          templateIdOrAlias
        )
        return { builds }
      } catch (error) {
        l.error(
          {
            key: 'trpc:builds:get_running_builds:error',
            error,
            team_id: teamId,
            template_id_or_alias: templateIdOrAlias,
          },
          `Failed to get running builds: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch running builds',
        })
      }
    }),

  getCompletedBuilds: protectedTeamProcedure
    .input(
      z.object({
        templateIdOrAlias: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = ctx
      const { templateIdOrAlias, limit, cursor } = input

      try {
        const result = await buildsRepo.getCompletedBuilds(
          teamId,
          templateIdOrAlias,
          { limit, cursor }
        )
        return result
      } catch (error) {
        l.error(
          {
            key: 'trpc:builds:get_completed_builds:error',
            error,
            team_id: teamId,
            template_id_or_alias: templateIdOrAlias,
          },
          `Failed to get completed builds: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch completed builds',
        })
      }
    }),

  list: protectedTeamProcedure
    .input(
      z.object({
        templateIdOrAlias: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = ctx
      const { templateIdOrAlias, limit, cursor } = input

      try {
        const result = await buildsRepo.listBuilds(teamId, templateIdOrAlias, {
          limit,
          cursor,
        })
        return result
      } catch (error) {
        l.error(
          {
            key: 'trpc:builds:list:error',
            error,
            team_id: teamId,
            template_id_or_alias: templateIdOrAlias,
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
