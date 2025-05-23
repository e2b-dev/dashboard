import 'server-only'

import { z } from 'zod'
import { MOCK_METRICS_DATA, MOCK_SANDBOXES_DATA } from '@/configs/mock-data'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { getApiUrl } from '@/lib/utils/server'
import { Sandbox } from '@/types/api'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'

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

    const { url } = await getApiUrl()

    const res = await fetch(`${url}/sandboxes?state=running`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
    })

    if (!res.ok) {
      const content = await res.text()
      logError(ERROR_CODES.INFRA, '/sandboxes', content)

      // this case should never happen for the original reason, hence we assume the user defined the wrong infra domain
      return returnServerError(
        "Something went wrong when accessing the API. Ensure you are using the correct Infrastructure Domain under 'Developer Settings'"
      )
    }

    const json = (await res.json()) as Sandbox[]

    return json
  })
