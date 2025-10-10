import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { Invoice } from '@/types/billing'
import { z } from 'zod'

const GetInvoicesParamsSchema = z.object({
  teamId: z.uuid(),
})

export const getInvoices = authActionClient
  .schema(GetInvoicesParamsSchema)
  .metadata({ serverFunctionName: 'getInvoices' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

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
