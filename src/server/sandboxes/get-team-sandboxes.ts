import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { MOCK_SANDBOXES_DATA } from '@/configs/mock-data'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger'
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

      if (process.env.NEXT_PUBLIC_MOCK_DATA === '1') {
        await new Promise((resolve) => setTimeout(resolve, 200))

        const sandboxes = MOCK_SANDBOXES_DATA()

        return {
          sandboxes,
        }
      }

      const sandboxesRes = await infra.GET('/v2/sandboxes', {
        params: {
          query: {
            state: ['running'],
          },
        },
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        cache: 'no-store',
      })

      if (sandboxesRes.error) {
        const status = sandboxesRes.response.status

        l.error('GET_TEAM_SANDBOXES:INFRA_ERROR', sandboxesRes.error, {
          teamId,
          userId: session.user.id,
          path: '/v2/sandboxes',
          status,
        })

        return handleDefaultInfraError(status)
      }

      console.log('sandboxesRes.data', sandboxesRes.data)

      return {
        sandboxes: sandboxesRes.data,
      }
    }
  )
