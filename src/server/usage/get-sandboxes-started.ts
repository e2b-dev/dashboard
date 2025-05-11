import 'server-cli-only'

import { checkUserTeamAuthorization } from '@/lib/utils/server'
import { z } from 'zod'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from "@/configs/constants";

const GetSandboxesStartedSchema = z.object({
  teamId: z.string().uuid(),
})

export const getSandboxesStarted = authActionClient
  .schema(GetSandboxesStartedSchema)
  .metadata({ serverFunctionName: 'getSandboxesStarted' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

    const isAuthorized = await checkUserTeamAuthorization(
      session.user.id,
      teamId
    )

    if (!isAuthorized) {
      return returnServerError('Forbidden')
    }

    const response = await fetch(`${process.env.BILLING_API_URL}/v2/teams/${teamId}/usage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
    })

    if (!response.ok) {
      const error = await response.json()

      throw new Error(error?.message ?? 'Failed to create team')
    }

    const result = await response.json()

    return {
      sandboxesStarted: result.map(({date, sandbox_count}) => ({
        date: new Date(date),
        count: Number(sandbox_count),
      })),
    }
  })
