import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { BillingLimit } from '@/types/billing'
import { z } from 'zod'

const GetBillingLimitsParamsSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getBillingLimits = authActionClient
  .schema(GetBillingLimitsParamsSchema)
  .metadata({ serverFunctionName: 'getBillingLimits' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { teamId, session } = ctx

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
