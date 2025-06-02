import 'server-only'

import { z } from 'zod'
import { DefaultTemplate, Template } from '@/types/api'
import {
  MOCK_DEFAULT_TEMPLATES_DATA,
  MOCK_TEMPLATES_DATA,
} from '@/configs/mock-data'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { actionClient, authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'

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

    const res = await fetch(
      `${process.env.INFRA_API_URL}/templates?teamID=${teamId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(session.access_token),
        },
      }
    )

    if (!res.ok) {
      const content = await res.text()
      logError(ERROR_CODES.INFRA, '/templates', content)

      // this case should never happen for the described reason, hence we assume the user defined the wrong infra domain
      return returnServerError(
        "Something went wrong when accessing the API. Ensure you are using the correct Infrastructure Domain under 'Developer Settings'"
      )
    }

    const data = (await res.json()) as Template[]

    return {
      templates: data,
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
        logError(
          ERROR_CODES.INFRA,
          `Failed to fetch build for env ${env.id}`,
          buildError
        )
        continue
      }

      const { data: aliases, error: aliasesError } = await supabaseAdmin
        .from('env_aliases')
        .select('alias')
        .eq('env_id', env.id)

      if (aliasesError) {
        logError(
          ERROR_CODES.INFRA,
          `Failed to fetch aliases for env ${env.id}`,
          aliasesError
        )
        continue
      }

      let createdBy = null
      if (env.created_by) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from('auth_users')
          .select('id, email')
          .eq('id', env.created_by)
          .single()

        if (!userError && userData && userData.id) {
          createdBy = {
            id: userData.id,
            email: userData.email || '',
          }
        }
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
        createdBy,
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
