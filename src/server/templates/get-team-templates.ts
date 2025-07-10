import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import {
  MOCK_DEFAULT_TEMPLATES_DATA,
  MOCK_TEMPLATES_DATA,
} from '@/configs/mock-data'
import { actionClient, authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger'
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

    if (process.env.NEXT_PUBLIC_MOCK_DATA === '1') {
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
      l.error('GET_TEAM_TEMPLATES:INFRA_ERROR', res.error, res.response, {
        status,
      })

      return handleDefaultInfraError(status)
    }

    return {
      templates: res.data,
    }
  })

export const getDefaultTemplates = actionClient
  .metadata({ serverFunctionName: 'getDefaultTemplates' })
  .action(async () => {
    if (process.env.NEXT_PUBLIC_MOCK_DATA === '1') {
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
        .select('id, ram_mb, vcpu')
        .eq('env_id', env.id)
        .eq('status', 'uploaded')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (buildError) {
        l.error('GET_DEFAULT_TEMPLATES:INFRA_ERROR', buildError, {
          envId: env.id,
        })
        continue
      }

      const { data: aliases, error: aliasesError } = await supabaseAdmin
        .from('env_aliases')
        .select('alias')
        .eq('env_id', env.id)

      if (aliasesError) {
        l.error('GET_DEFAULT_TEMPLATES:INFRA_ERROR', aliasesError, {
          envId: env.id,
        })
        continue
      }

      templates.push({
        templateID: env.id,
        buildID: latestBuild.id,
        cpuCount: latestBuild.vcpu,
        memoryMB: latestBuild.ram_mb,
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
