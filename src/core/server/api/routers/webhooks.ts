import { createWebhooksRepository } from '@/core/modules/webhooks/repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/errors'
import { withTeamAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import {
  DeleteWebhookInputSchema,
  UpdateWebhookSecretInputSchema,
  UpsertWebhookInputSchema,
} from '@/core/server/functions/webhooks/schema'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import { l } from '@/core/shared/clients/logger/logger'

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

  upsert: webhooksRepositoryProcedure
    .input(UpsertWebhookInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { mode, webhookId, name, url, events, signatureSecret, enabled } =
        input

      const result = await ctx.webhooksRepository.upsertWebhook({
        mode: mode === 'add' ? 'create' : 'edit',
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
              mode === 'edit'
                ? 'update_webhook_trpc:error'
                : 'create_webhook_trpc:error',
            status: result.error.status,
            error: result.error,
            team_id: ctx.teamId,
            user_id: ctx.session.user.id,
            context: { mode, name, url, events },
          },
          `Failed to ${mode === 'edit' ? 'update' : 'create'} webhook: ${result.error.status}: ${result.error.message}`
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
