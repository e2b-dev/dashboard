import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  MOCK_DEFAULT_TEMPLATES_DATA,
  MOCK_TEMPLATES_DATA,
} from '@/configs/mock-data'
import { api, infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import type { DefaultTemplate } from '@/types/api.types'
import { apiError } from '../errors'
import { createTRPCRouter } from '../init'
import { protectedProcedure, protectedTeamProcedure } from '../procedures'

export const templatesRouter = createTRPCRouter({
  // QUERIES

  getTemplates: protectedTeamProcedure.query(async ({ ctx }) => {
    const { session, teamId } = ctx

    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      return {
        templates: MOCK_TEMPLATES_DATA,
      }
    }

    const res = await infra.GET('/templates', {
      params: {
        query: {
          teamID: teamId,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
    })

    if (!res.response.ok || res.error) {
      const status = res.response.status

      l.error(
        {
          key: 'trpc:templates:get_team_templates:infra_error',
          error: res.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
          },
        },
        `failed to fetch /templates: ${res.error?.message || 'Unknown error'}`
      )

      throw apiError(status)
    }

    return {
      templates: res.data,
    }
  }),

  getDefaultTemplatesCached: protectedProcedure.query(async ({ ctx }) => {
    return getDefaultTemplatesCached(ctx.session.access_token)
  }),

  // MUTATIONS

  deleteTemplate: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session, teamId } = ctx
      const { templateId } = input

      const res = await infra.DELETE('/templates/{templateID}', {
        params: {
          path: {
            templateID: templateId,
          },
        },
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
      })

      if (!res.response.ok || res.error) {
        const status = res.response.status

        l.error(
          {
            key: 'trpc:templates:delete_template:infra_error',
            error: res.error,
            user_id: session.user.id,
            team_id: teamId,
            template_id: templateId,
            context: {
              status,
            },
          },
          `failed to delete /templates/{templateID}: ${res.error?.message || 'Unknown error'}`
        )

        if (status === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          })
        }

        if (
          status === 400 &&
          res.error?.message?.includes(
            'because there are paused sandboxes using it'
          )
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Cannot delete template because there are paused sandboxes using it',
          })
        }

        throw apiError(status)
      }

      return { success: true }
    }),

  updateTemplate: protectedTeamProcedure
    .input(
      z.object({
        templateId: z.string(),
        public: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session, teamId } = ctx
      const { templateId, public: isPublic } = input

      const res = await infra.PATCH('/templates/{templateID}', {
        body: {
          public: isPublic,
        },
        params: {
          path: {
            templateID: templateId,
          },
        },
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
      })

      if (!res.response.ok || res.error) {
        const status = res.response.status

        l.error(
          {
            key: 'trpc:templates:update_template:infra_error',
            error: res.error,
            user_id: session.user.id,
            team_id: teamId,
            template_id: templateId,
            context: {
              status,
            },
          },
          `failed to patch /templates/{templateID}: ${res.error?.message || 'Unknown error'}`
        )

        if (status === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          })
        }

        throw apiError(status)
      }

      return { success: true, public: isPublic }
    }),
})

async function getDefaultTemplatesCached(accessToken: string) {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      templates: MOCK_DEFAULT_TEMPLATES_DATA,
    }
  }

  const { data, error } = await api.GET('/templates/defaults', {
    headers: SUPABASE_AUTH_HEADERS(accessToken),
    next: { tags: [CACHE_TAGS.DEFAULT_TEMPLATES] },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.templates || data.templates.length === 0) {
    return { templates: [] as DefaultTemplate[] }
  }

  const templates: DefaultTemplate[] = data.templates.map((t) => ({
    templateID: t.id,
    buildID: t.buildId,
    cpuCount: t.vcpu,
    memoryMB: t.ramMb,
    diskSizeMB: t.totalDiskSizeMb ?? 0,
    envdVersion: t.envdVersion ?? '',
    public: t.public,
    aliases: t.aliases.map((a) => a.alias),
    names: t.aliases.map((a) => {
      if (a.namespace && a.namespace.length > 0) {
        return `${a.namespace}/${a.alias}`
      }
      return a.alias
    }),
    createdAt: t.createdAt,
    updatedAt: t.createdAt,
    createdBy: null,
    lastSpawnedAt: t.createdAt,
    spawnCount: t.spawnCount,
    buildCount: t.buildCount,
    isDefault: true as const,
  }))

  return { templates }
}
