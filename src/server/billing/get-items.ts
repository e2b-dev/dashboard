import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { TeamItems } from '@/types/billing'
import { z } from 'zod'

const GetItemsParamsSchema = z.object({
  teamId: z.uuid(),
})

export const getItems = authActionClient
  .schema(GetItemsParamsSchema)
  .metadata({ serverFunctionName: 'getItems' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${teamId}/items`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()

      throw new Error(
        text ?? `Failed to fetch billing endpoint: /teams/${teamId}/items`
      )
    }

    const items = (await res.json()) as TeamItems

    return items
  })
