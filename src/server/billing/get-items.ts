import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { TeamItems } from '@/types/billing.types'
import { z } from 'zod'

const GetItemsParamsSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getItems = authActionClient
  .schema(GetItemsParamsSchema)
  .metadata({ serverFunctionName: 'getItems' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { teamId, session } = ctx

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
