import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  MOCK_DEFAULT_TEMPLATES_DATA,
  MOCK_TEMPLATES_DATA,
} from '@/configs/mock-data'
import { actionClient, authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { DefaultTemplate } from '@/types/api'
import { z } from 'zod'

const GetTeamTemplatesSchema = z.object({
  teamId: z.string().uuid(),
})

export const getTeamTemplates = authActionClient
  .schema(GetTeamTemplatesSchema)
  .metadata({ serverFunctionName: 'getTeamTemplates' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

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
          key: 'get_team_templates:infra_error',
          error: res.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
          },
        },
        `Failed to get team templates: ${res.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    return {
      templates: res.data,
    }
  })

export const getDefaultTemplates = actionClient
  .metadata({ serverFunctionName: 'getDefaultTemplates' })
  .action(async () => {
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
            key: 'get_default_templates:env_builds_supabase_error',
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
            key: 'get_default_templates:env_aliases_supabase_error',
            error: aliasesError,
            template_id: env.id,
          },
          `Failed to get template aliases: ${aliasesError.message || 'Unknown error'}`
        )
        continue
      }

      // these values should never be null/undefined at this point, especially for default templates
      if (!latestBuild.total_disk_size_mb || !latestBuild.envd_version) {
        l.error(
          {
            key: 'get_default_templates:env_builds_missing_values',
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
          defaultEnvs.find((e) => e.env_id === env.id)?.description ??
          undefined,
      })
    }

    return {
      templates: templates,
    }
  })
