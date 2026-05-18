import { createWebhooksRepository } from '@/core/modules/webhooks/repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/errors'
import { withTeamAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import {
  DeleteWebhookInputSchema,
  GetWebhookDeliveryInputSchema,
  GetWebhookDeliveryStatsInputSchema,
  GetWebhookInputSchema,
  ListWebhookDeliveriesInputSchema,
  UpdateWebhookSecretInputSchema,
  UpsertWebhookInputSchema,
} from '@/core/server/functions/webhooks/schema'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import { l } from '@/core/shared/clients/logger/logger'
import type { components as ArgusComponents } from '@/core/shared/contracts/argus-api.types'

type WebhookDelivery = ArgusComponents['schemas']['WebhookDelivery']
type WebhookDeliveryEvent = ArgusComponents['schemas']['WebhookDeliveryEvent']

// Returns the newest delivery attempt, e.g. [10:00, 10:05] -> 10:05.
const getLatestAttempt = (
  attempts: WebhookDelivery[]
): WebhookDelivery | null => {
  const sortedAttempts = [...attempts].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  )

  return sortedAttempts[0] ?? null
}

const toDeliveryEventGroup = (event: WebhookDeliveryEvent) => {
  const attempts = [...event.attempts].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  )

  return {
    eventId: event.eventId,
    eventType: event.eventType,
    sandboxId: event.sandboxId,
    attempts,
    attemptCount: attempts.length,
    latestAttempt: getLatestAttempt(attempts),
  }
}

const webhooksRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(
    createWebhooksRepository,
    (webhooksRepository) => ({ webhooksRepository })
  )
)

export const webhooksRouter = createTRPCRouter({
  list: webhooksRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.webhooksRepository.listWebhooks()

    if (!result.ok) {
      l.error(
        {
          key: 'list_webhooks_trpc:error',
          status: result.error.status,
          error: result.error,
          team_id: ctx.teamId,
          user_id: ctx.session.user.id,
        },
        `Failed to list webhooks: ${result.error.status}: ${result.error.message}`
      )

      throwTRPCErrorFromRepoError(result.error)
    }

    return { webhooks: result.data }
  }),

  get: webhooksRepositoryProcedure
    .input(GetWebhookInputSchema)
    .query(async ({ ctx, input }) => {
      const result = await ctx.webhooksRepository.getWebhook(input.webhookId)

      if (!result.ok) {
        l.error(
          {
            key: 'get_webhook_trpc:error',
            status: result.error.status,
            error: result.error,
            team_id: ctx.teamId,
            user_id: ctx.session.user.id,
            context: { webhookId: input.webhookId },
          },
          `Failed to get webhook: ${result.error.status}: ${result.error.message}`
        )

        throwTRPCErrorFromRepoError(result.error)
      }

      return { webhook: result.data }
    }),

  listDeliveries: webhooksRepositoryProcedure
    .input(ListWebhookDeliveriesInputSchema)
    .query(async ({ ctx, input }) => {
      const result = await ctx.webhooksRepository.listWebhookDeliveries({
        webhookId: input.webhookId,
        limit: input.limit,
        cursor: input.cursor,
        orderAsc: input.orderAsc,
        start: input.start,
        end: input.end,
        deliveryStatus:
          input.deliveryStatus === 'all' ? undefined : input.deliveryStatus,
        eventType: input.eventType,
      })

      if (!result.ok) {
        l.error(
          {
            key: 'list_webhook_deliveries_trpc:error',
            status: result.error.status,
            error: result.error,
            team_id: ctx.teamId,
            user_id: ctx.session.user.id,
            context: {
              webhookId: input.webhookId,
              deliveryStatus: input.deliveryStatus,
              eventType: input.eventType,
            },
          },
          `Failed to list webhook deliveries: ${result.error.status}: ${result.error.message}`
        )

        throwTRPCErrorFromRepoError(result.error)
      }

      return {
        groups: result.data.data.map(toDeliveryEventGroup),
        nextCursor: result.data.nextCursor,
      }
    }),

  getDelivery: webhooksRepositoryProcedure
    .input(GetWebhookDeliveryInputSchema)
    .query(async ({ ctx, input }) => {
      const result = await ctx.webhooksRepository.getWebhookDelivery({
        webhookId: input.webhookId,
        deliveryId: input.deliveryId,
      })

      if (!result.ok) {
        l.error(
          {
            key: 'get_webhook_delivery_trpc:error',
            status: result.error.status,
            error: result.error,
            team_id: ctx.teamId,
            user_id: ctx.session.user.id,
            context: {
              webhookId: input.webhookId,
              deliveryId: input.deliveryId,
            },
          },
          `Failed to get webhook delivery: ${result.error.status}: ${result.error.message}`
        )

        throwTRPCErrorFromRepoError(result.error)
      }

      return { delivery: result.data }
    }),

  getDeliveryStats: webhooksRepositoryProcedure
    .input(GetWebhookDeliveryStatsInputSchema)
    .query(async ({ ctx, input }) => {
      const result = await ctx.webhooksRepository.getWebhookDeliveryStats({
        webhookId: input.webhookId,
        start: input.start,
        end: input.end,
      })

      if (!result.ok) {
        l.error(
          {
            key: 'get_webhook_delivery_stats_trpc:error',
            status: result.error.status,
            error: result.error,
            team_id: ctx.teamId,
            user_id: ctx.session.user.id,
            context: {
              webhookId: input.webhookId,
              start: input.start,
              end: input.end,
            },
          },
          `Failed to get webhook delivery stats: ${result.error.status}: ${result.error.message}`
        )

        throwTRPCErrorFromRepoError(result.error)
      }

      return { stats: result.data }
    }),

  upsert: webhooksRepositoryProcedure
    .input(UpsertWebhookInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { mode, webhookId, name, url, events, signatureSecret, enabled } =
        input

      const result = await ctx.webhooksRepository.upsertWebhook({
        mode,
        webhookId: webhookId ?? undefined,
        name,
        url,
        events,
        signatureSecret: signatureSecret ?? undefined,
        enabled: enabled ?? true,
      })

      if (!result.ok) {
        l.error(
          {
            key:
              mode === 'update'
                ? 'update_webhook_trpc:error'
                : 'create_webhook_trpc:error',
            status: result.error.status,
            error: result.error,
            team_id: ctx.teamId,
            user_id: ctx.session.user.id,
            context: { mode, name, events },
          },
          `Failed to ${mode} webhook: ${result.error.status}: ${result.error.message}`
        )

        throwTRPCErrorFromRepoError(result.error)
      }
    }),

  delete: webhooksRepositoryProcedure
    .input(DeleteWebhookInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.webhooksRepository.deleteWebhook(input.webhookId)

      if (!result.ok) {
        l.error(
          {
            key: 'delete_webhook_trpc:error',
            status: result.error.status,
            error: result.error,
            team_id: ctx.teamId,
            user_id: ctx.session.user.id,
            context: { webhookId: input.webhookId },
          },
          `Failed to delete webhook: ${result.error.status}: ${result.error.message}`
        )

        throwTRPCErrorFromRepoError(result.error)
      }
    }),

  updateSecret: webhooksRepositoryProcedure
    .input(UpdateWebhookSecretInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.webhooksRepository.updateWebhookSecret(
        input.webhookId,
        input.signatureSecret
      )

      if (!result.ok) {
        l.error(
          {
            key: 'update_webhook_secret_trpc:error',
            status: result.error.status,
            error: result.error,
            team_id: ctx.teamId,
            user_id: ctx.session.user.id,
            context: { webhookId: input.webhookId },
          },
          `Failed to update webhook secret: ${result.error.status}: ${result.error.message}`
        )

        throwTRPCErrorFromRepoError(result.error)
      }
    }),
})
