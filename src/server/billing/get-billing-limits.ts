import 'server-only'

import { z } from 'zod'
import { BillingLimit } from '@/types/billing'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'

const GetBillingLimitsParamsSchema = z.object({
  teamId: z.string().uuid(),
})

export const getBillingLimits = authActionClient
  .schema(GetBillingLimitsParamsSchema)
  .metadata({ serverFunctionName: 'getBillingLimits' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${teamId}/billing-limits`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(session.access_token),
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()

      throw new Error(
        text ??
          `Failed to fetch billing endpoint: /teams/${teamId}/billing-limits`
      )
    }

    const limit = (await res.json()) as BillingLimit

    return limit
  })
