import { TRPCError } from '@trpc/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import {
  ADDON_500_SANDBOXES_ID,
  ADDON_PURCHASE_ACTION_ERRORS,
} from '@/features/dashboard/billing/constants'

function limitTypeToKey(type: 'limit' | 'alert') {
  return type === 'limit' ? 'limit_amount_gte' : 'alert_amount_gte'
}

export const billingRouter = createTRPCRouter({
  createCheckout: protectedTeamProcedure
    .input(z.object({ tierId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.billing.createCheckout(input.tierId)
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
      return result.data
    }),

  createCustomerPortalSession: protectedTeamProcedure.mutation(
    async ({ ctx }) => {
      const origin = (await headers()).get('origin')
      const result =
        await ctx.services.billing.createCustomerPortalSession(origin)
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
      return { url: result.data.url }
    }
  ),

  getItems: protectedTeamProcedure.query(async ({ ctx }) => {
    const result = await ctx.services.billing.getItems()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getUsage: protectedTeamProcedure.query(async ({ ctx }) => {
    const result = await ctx.services.billing.getUsage()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getInvoices: protectedTeamProcedure.query(async ({ ctx }) => {
    const result = await ctx.services.billing.getInvoices()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getLimits: protectedTeamProcedure.query(async ({ ctx }) => {
    const result = await ctx.services.billing.getLimits()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getTeamLimits: protectedTeamProcedure.query(async ({ ctx }) => {
    const limitsResult = await ctx.services.teams.getTeamLimitsByIdOrSlug(
      ctx.teamId
    )
    if (!limitsResult.ok) {
      throwTRPCErrorFromRepoError(limitsResult.error)
    }

    return limitsResult.data
  }),

  setLimit: protectedTeamProcedure
    .input(
      z.object({
        type: z.enum(['limit', 'alert']),
        value: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { type, value } = input
      const result = await ctx.services.billing.setLimit(
        limitTypeToKey(type),
        value
      )
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    }),

  clearLimit: protectedTeamProcedure
    .input(z.object({ type: z.enum(['limit', 'alert']) }))
    .mutation(async ({ ctx, input }) => {
      const { type } = input
      const result = await ctx.services.billing.clearLimit(limitTypeToKey(type))
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    }),

  createOrder: protectedTeamProcedure
    .input(z.object({ itemId: z.literal(ADDON_500_SANDBOXES_ID) }))
    .mutation(async ({ ctx, input }) => {
      const { itemId } = input
      const result = await ctx.services.billing.createOrder(itemId)
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
      return result.data
    }),

  confirmOrder: protectedTeamProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orderId } = input
      const result = await ctx.services.billing.confirmOrder(orderId)
      if (!result.ok) {
        if (
          result.error.message.includes(
            'Missing payment method, please update your payment information'
          )
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: ADDON_PURCHASE_ACTION_ERRORS.missingPaymentMethod,
          })
        }
        throwTRPCErrorFromRepoError(result.error)
      }

      return result.data
    }),

  getCustomerSession: protectedTeamProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.services.billing.getCustomerSession()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),
})
