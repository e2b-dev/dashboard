import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import { MOCK_SANDBOXES_DATA } from '@/configs/mock-data'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { Sandbox } from '@/types/api'
import { z } from 'zod'

const GetTeamSandboxesSchema = z.object({
  teamId: z.string().uuid(),
})

export const getTeamSandboxes = authActionClient
  .schema(GetTeamSandboxesSchema)
  .metadata({ serverFunctionName: 'getTeamSandboxes' })
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<{
      sandboxes: Sandbox[]
    }> => {
      const { teamId } = parsedInput
      const { session } = ctx

      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 200))

        const sandboxes = MOCK_SANDBOXES_DATA()

        return {
          sandboxes,
        }
      }

      const sandboxesRes = await infra.GET('/sandboxes', {
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        cache: 'no-store',
      })

      if (sandboxesRes.error) {
        const status = sandboxesRes.response.status

        l.error(
          {
            key: 'get_team_sandboxes:infra_error',
            error: sandboxesRes.error,
            team_id: teamId,
            user_id: session.user.id,
            context: {
              status,
            },
          },
          `Failed to get team sandboxes: ${sandboxesRes.error.message}`
        )

        return handleDefaultInfraError(status)
      }

      l.info(
        {
          key: 'get_team_sandboxes:success',
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status: sandboxesRes.response.status,
            path: '/sandboxes',
            sandbox_count: sandboxesRes.data.length,
          },
        },
        `Successfully fetched team sandboxes`
      )

      return {
        sandboxes: sandboxesRes.data,
      }
    }
  )
