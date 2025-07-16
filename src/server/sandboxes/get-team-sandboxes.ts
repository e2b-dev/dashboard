import 'server-only'

import { z } from 'zod'
import { MOCK_SANDBOXES_DATA } from '@/configs/mock-data'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'
import { authActionClient } from '@/lib/clients/action'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { Sandbox } from '@/types/api'

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

        logError(
          ERROR_CODES.INFRA,
          '/v2/sandboxes',
          status,
          sandboxesRes.error,
          sandboxesRes.data
        )

        return handleDefaultInfraError(status)
      }

      console.log('sandboxesRes.data', sandboxesRes.data)

      return {
        sandboxes: sandboxesRes.data,
      }
    }
  )
