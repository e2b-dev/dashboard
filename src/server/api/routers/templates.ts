import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  MOCK_DEFAULT_TEMPLATES_DATA,
  MOCK_TEMPLATES_DATA,
} from '@/configs/mock-data'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { DefaultTemplate } from '@/types/api.types'
import { TRPCError } from '@trpc/server'
import { cacheLife, cacheTag } from 'next/cache'
import { z } from 'zod'
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
        ...SUPABASE_AUTH_HEADERS(session.access_token),
      },
    })

    if (res.error) {
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
        `Failed to get team templates: ${res.error.message}`
      )

      throw apiError(status)
    }

    return {
      templates: res.data,
    }
  }),

  getDefaultTemplatesCached: protectedProcedure.query(async () => {
    return getDefaultTemplatesCached()
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
          ...SUPABASE_AUTH_HEADERS(session.access_token),
        },
      })

      if (res.error) {
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
          `Failed to delete template: ${res.error.message}`
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
          ...SUPABASE_AUTH_HEADERS(session.access_token),
        },
      })

      if (res.error) {
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
          `Failed to update template: ${res.error.message}`
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

async function getDefaultTemplatesCached() {
  'use cache: remote'
  cacheTag(CACHE_TAGS.DEFAULT_TEMPLATES)
  cacheLife('hours')

  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      templates: MOCK_DEFAULT_TEMPLATES_DATA,
    }
  }

  const { data: defaultEnvs, error: defaultEnvsError } = await supabaseAdmin
    .from('env_defaults')
    .select('*')

  if (defaultEnvsError) {
    throw defaultEnvsError
  }

  if (!defaultEnvs || defaultEnvs.length === 0) {
    return {
      templates: [],
    }
  }

  const envIds = defaultEnvs.map((env) => env.env_id)

  const { data: envs, error: envsError } = await supabaseAdmin
    .from('envs')
    .select(
      `
        id,
        created_at,
        updated_at,
        public,
        build_count,
        spawn_count,
        last_spawned_at,
        created_by
      `
    )
    .in('id', envIds)

  if (envsError) {
    throw envsError
  }

  const templates: DefaultTemplate[] = []

  for (const env of envs) {
    const { data: latestBuild, error: buildError } = await supabaseAdmin
      .from('env_builds')
      .select('id, ram_mb, vcpu, total_disk_size_mb, envd_version')
      .eq('env_id', env.id)
      .eq('status', 'uploaded')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (buildError) {
      l.error(
        {
          key: 'trpc:templates:get_default_templates:env_builds_supabase_error',
          error: buildError,
          template_id: env.id,
        },
        `Failed to get template builds: ${buildError.message || 'Unknown error'}`
      )
      continue
    }

    const { data: aliases, error: aliasesError } = await supabaseAdmin
      .from('env_aliases')
      .select('alias')
      .eq('env_id', env.id)

    if (aliasesError) {
      l.error(
        {
          key: 'trpc:templates:get_default_templates:env_aliases_supabase_error',
          error: aliasesError,
          template_id: env.id,
        },
        `Failed to get template aliases: ${aliasesError.message || 'Unknown error'}`
      )
      continue
    }

    if (!latestBuild.total_disk_size_mb || !latestBuild.envd_version) {
      l.error(
        {
          key: 'trpc:templates:get_default_templates:env_builds_missing_values',
          template_id: env.id,
        },
        `Template build missing required values: total_disk_size_mb or envd_version`
      )
      continue
    }

    templates.push({
      templateID: env.id,
      buildID: latestBuild.id,
      cpuCount: latestBuild.vcpu,
      memoryMB: latestBuild.ram_mb,
      diskSizeMB: latestBuild.total_disk_size_mb,
      envdVersion: latestBuild.envd_version,
      public: env.public,
      aliases: aliases.map((a) => a.alias),
      createdAt: env.created_at,
      updatedAt: env.updated_at,
      createdBy: null,
      lastSpawnedAt: env.last_spawned_at ?? env.created_at,
      spawnCount: env.spawn_count,
      buildCount: env.build_count,
      isDefault: true,
      defaultDescription:
        defaultEnvs.find((e) => e.env_id === env.id)?.description ?? undefined,
    })
  }

  return {
    templates: templates,
  }
}
