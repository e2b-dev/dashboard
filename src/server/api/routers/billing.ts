import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import {
  CustomerPortalResponse,
  Invoice,
  TeamItems,
  UsageResponse,
} from '@/types/billing.types'
import { TRPCError } from '@trpc/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createTRPCRouter } from '../init'
import { protectedTeamProcedure } from '../procedures'

export const billingRouter = createTRPCRouter({
  createCheckout: protectedTeamProcedure
    .input(z.object({ tierId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, session } = ctx
      const { tierId } = input

      const res = await fetch(`${process.env.BILLING_API_URL}/checkouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        body: JSON.stringify({
          teamID: teamId,
          tierID: tierId,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: text ?? 'Failed to create checkout session',
        })
      }

      const data = (await res.json()) as { url: string; error?: string }

      if (data.error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: data.error,
        })
      }

      return { url: data.url }
    }),

  createCustomerPortalSession: protectedTeamProcedure.mutation(
    async ({ ctx }) => {
      const { teamId, session } = ctx

      const origin = (await headers()).get('origin')

      const res = await fetch(`${process.env.BILLING_API_URL}/stripe/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(origin && { Origin: origin }),
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
      })

      if (!res.ok) {
        const text = await res.text()
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: text ?? 'Failed to create customer portal session',
        })
      }

      const data = (await res.json()) as CustomerPortalResponse

      return { url: data.url }
    }
  ),

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

  getUsage: protectedTeamProcedure.query(async ({ ctx }) => {
    const { teamId, session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/v2/teams/${teamId}/usage`,
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
        message: text ?? 'Failed to fetch usage data',
      })
    }

    const responseData: UsageResponse = await res.json()

    // convert unix seconds to milliseconds because JavaScript
    const data: UsageResponse = {
      ...responseData,
      hour_usages: responseData.hour_usages.map((hour) => ({
        ...hour,
        timestamp: hour.timestamp * 1000,
      })),
    }

    return data
  }),

  getInvoices: protectedTeamProcedure.query(async ({ ctx }) => {
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

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          text ?? `Failed to fetch billing endpoint: /teams/${teamId}/invoices`,
      })
    }

    const invoices = (await res.json()) as Invoice[]

    return invoices
  }),
})
