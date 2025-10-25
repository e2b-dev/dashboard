import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { UsageResponse } from '@/types/billing'
import { z } from 'zod'

const GetUsageAuthActionSchema = z.object({
  teamId: z.uuid(),
})

export const getUsage = authActionClient
  .schema(GetUsageAuthActionSchema)
  .metadata({ serverFunctionName: 'getUsage' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const accessToken = ctx.session.access_token

    const response = await fetch(
      `${process.env.BILLING_API_URL}/v2/teams/${teamId}/usage`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
        },
      }
    )

    if (!response.ok) {
      const text = (await response.text()) ?? 'Failed to fetch usage data'
      return returnServerError(text)
    }

    return (await response.json()) as UsageResponse
  })
