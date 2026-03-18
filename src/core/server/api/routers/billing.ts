import { TRPCError } from '@trpc/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createBillingRepository } from '@/core/domains/billing/repository.server'
import { createTeamsRepository } from '@/core/domains/teams/teams-repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { withTeamAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import {
  ADDON_500_SANDBOXES_ID,
  ADDON_PURCHASE_ACTION_ERRORS,
} from '@/features/dashboard/billing/constants'

function limitTypeToKey(type: 'limit' | 'alert') {
  return type === 'limit' ? 'limit_amount_gte' : 'alert_amount_gte'
}

const billingRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(
    createBillingRepository,
    (billingRepository) => ({
      billingRepository,
    })
  )
)

const billingAndTeamsRepositoryProcedure = billingRepositoryProcedure.use(
  withTeamAuthedRequestRepository(createTeamsRepository, (teamsRepository) => ({
    teamsRepository,
  }))
)

export const billingRouter = createTRPCRouter({
  createCheckout: billingRepositoryProcedure
    .input(z.object({ tierId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.billingRepository.createCheckout(input.tierId)
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
      return result.data
    }),

  createCustomerPortalSession: billingRepositoryProcedure.mutation(
    async ({ ctx }) => {
      const origin = (await headers()).get('origin')
      const result =
        await ctx.billingRepository.createCustomerPortalSession(origin)
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
      return { url: result.data.url }
    }
  ),

  getItems: billingRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.billingRepository.getItems()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getUsage: billingRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.billingRepository.getUsage()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getInvoices: billingRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.billingRepository.getInvoices()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getLimits: billingRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.billingRepository.getLimits()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),

  getTeamLimits: billingAndTeamsRepositoryProcedure.query(async ({ ctx }) => {
    const limitsResult = await ctx.teamsRepository.getTeamLimits()
    if (!limitsResult.ok) {
      throwTRPCErrorFromRepoError(limitsResult.error)
    }

    return limitsResult.data
  }),

  setLimit: billingRepositoryProcedure
    .input(
      z.object({
        type: z.enum(['limit', 'alert']),
        value: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { type, value } = input
      const result = await ctx.billingRepository.setLimit(
        limitTypeToKey(type),
        value
      )
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    }),

  clearLimit: billingRepositoryProcedure
    .input(z.object({ type: z.enum(['limit', 'alert']) }))
    .mutation(async ({ ctx, input }) => {
      const { type } = input
      const result = await ctx.billingRepository.clearLimit(
        limitTypeToKey(type)
      )
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    }),

  createOrder: billingRepositoryProcedure
    .input(z.object({ itemId: z.literal(ADDON_500_SANDBOXES_ID) }))
    .mutation(async ({ ctx, input }) => {
      const { itemId } = input
      const result = await ctx.billingRepository.createOrder(itemId)
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)
      return result.data
    }),

  confirmOrder: billingRepositoryProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orderId } = input
      const result = await ctx.billingRepository.confirmOrder(orderId)
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

  getCustomerSession: billingRepositoryProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.billingRepository.getCustomerSession()
    if (!result.ok) throwTRPCErrorFromRepoError(result.error)
    return result.data
  }),
})
