import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { MOCK_METRICS_DATA, MOCK_SANDBOXES_DATA } from '@/configs/mock-data'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { z } from 'zod'

const GetTeamSandboxesSchema = z.object({
  teamId: z.string().uuid(),
})

export const getTeamSandboxes = authActionClient
  .schema(GetTeamSandboxesSchema)
  .metadata({ serverFunctionName: 'getTeamSandboxes' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

    if (process.env.NEXT_PUBLIC_MOCK_DATA === '1') {
      await new Promise((resolve) => setTimeout(resolve, 200))

      const sandboxes = MOCK_SANDBOXES_DATA()
      const metrics = MOCK_METRICS_DATA(sandboxes)

      return sandboxes.map((sandbox) => ({
        ...sandbox,
        metrics: [metrics.get(sandbox.sandboxID)!],
      }))
    }

    const res = await infra.GET('/sandboxes', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
    })

    if (res.error) {
      const status = res.response.status

      l.error('GET_TEAM_SANDBOXES:INFRA_ERROR', res.error, res.response, {
        status,
      })

      return handleDefaultInfraError(status)
    }

    return res.data
  })
