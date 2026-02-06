import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import {
  ADDON_500_SANDBOXES_ID,
  ADDON_PURCHASE_ACTION_ERRORS,
} from '@/features/dashboard/billing/constants'
import getTeamLimitsMemo from '@/server/team/get-team-limits-memo'
import {
  AddOnOrderConfirmResponse,
  AddOnOrderCreateResponse,
  BillingLimit,
  CustomerPortalResponse,
  Invoice,
  PaymentMethodsCustomerSession,
  TeamItems,
  UsageResponse,
} from '@/types/billing.types'
import { TRPCError } from '@trpc/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createTRPCRouter } from '../init'
import { protectedTeamProcedure } from '../procedures'

function limitTypeToKey(type: 'limit' | 'alert') {
  return type === 'limit' ? 'limit_amount_gte' : 'alert_amount_gte'
}

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

  getLimits: protectedTeamProcedure.query(async ({ ctx }) => {
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

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          text ??
          `Failed to fetch billing endpoint: /teams/${teamId}/billing-limits`,
      })
    }

    const limits = (await res.json()) as BillingLimit

    return limits
  }),

  getTeamConcurrentLimit: protectedTeamProcedure.query(async ({ ctx }) => {
    const limits = await getTeamLimitsMemo(ctx.teamId, ctx.user.id)
    return {
      concurrentSandboxes: limits?.concurrentInstances ?? 0,
    }
  }),

  setLimit: protectedTeamProcedure
    .input(
      z.object({
        type: z.enum(['limit', 'alert']),
        value: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, session } = ctx
      const { type, value } = input

      const res = await fetch(
        `${process.env.BILLING_API_URL}/teams/${teamId}/billing-limits`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(session.access_token),
          },
          body: JSON.stringify({
            [limitTypeToKey(type)]: value,
          }),
        }
      )

      if (!res.ok) {
        const text = await res.text()

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: text ?? 'Failed to set limit',
        })
      }
    }),

  clearLimit: protectedTeamProcedure
    .input(z.object({ type: z.enum(['limit', 'alert']) }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, session } = ctx
      const { type } = input

      const res = await fetch(
        `${process.env.BILLING_API_URL}/teams/${teamId}/billing-limits/${limitTypeToKey(type)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(session.access_token),
          },
        }
      )

      if (!res.ok) {
        const text = await res.text()

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: text ?? 'Failed to clear limit',
        })
      }
    }),

  createOrder: protectedTeamProcedure
    .input(z.object({ itemId: z.literal(ADDON_500_SANDBOXES_ID) }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, session } = ctx
      const { itemId } = input

      const res = await fetch(
        `${process.env.BILLING_API_URL}/teams/${teamId}/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
          },
          body: JSON.stringify({
            items: [{ name: itemId, quantity: 1 }],
          }),
        }
      )

      if (!res.ok) {
        const text = await res.text()

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: text ?? 'Failed to create order',
        })
      }

      const data = (await res.json()) as AddOnOrderCreateResponse

      return data
    }),

  confirmOrder: protectedTeamProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, session } = ctx
      const { orderId } = input

      const res = await fetch(
        `${process.env.BILLING_API_URL}/teams/${teamId}/orders/${orderId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
          },
        }
      )

      if (!res.ok) {
        const text = await res.text()

        if (
          text.includes(
            'Missing payment method, please update your payment information'
          )
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: ADDON_PURCHASE_ACTION_ERRORS.missingPaymentMethod,
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: text ?? 'Failed to confirm order',
        })
      }

      const data = (await res.json()) as AddOnOrderConfirmResponse

      return data
    }),

  getCustomerSession: protectedTeamProcedure.mutation(async ({ ctx }) => {
    const { teamId, session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${teamId}/payment-methods/customer-session`,
      {
        method: 'POST',
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
        message: text ?? 'Failed to fetch customer session',
      })
    }

    const data = (await res.json()) as PaymentMethodsCustomerSession

    return data
  }),
})
