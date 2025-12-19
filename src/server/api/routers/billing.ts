import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { TeamItems } from '@/types/billing.types'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter } from '../init'
import { protectedTeamProcedure } from '../procedures'

export const billingRouter = createTRPCRouter({
  getItems: protectedTeamProcedure.query(async ({ ctx }) => {
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

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          text ?? `Failed to fetch billing endpoint: /teams/${teamId}/items`,
      })
    }

    const items = (await res.json()) as TeamItems

    return items
  }),
})
