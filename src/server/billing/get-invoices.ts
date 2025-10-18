import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { Invoice } from '@/types/billing'
import { z } from 'zod'

const GetInvoicesParamsSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getInvoices = authActionClient
  .schema(GetInvoicesParamsSchema)
  .metadata({ serverFunctionName: 'getInvoices' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { teamId, session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${teamId}/invoices`,
      {
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()

      throw new Error(
        text ?? `Failed to fetch billing endpoint: /teams/${teamId}/invoices`
      )
    }

    const invoices = (await res.json()) as Invoice[]

    return invoices
  })
