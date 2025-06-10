import 'server-only'

import { z } from 'zod'
import { MOCK_METRICS_DATA, MOCK_SANDBOXES_DATA } from '@/configs/mock-data'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'
import { authActionClient } from '@/lib/clients/action'
import { handleDefaultInfraError, returnServerError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'

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
      query: {
        state: 'running',
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
    })

    if (res.error) {
      const status = res.error?.code ?? 500

      logError(ERROR_CODES.INFRA, '/sandboxes', res.error, res.data)

      return handleDefaultInfraError(status)
    }

    return res.data
  })
