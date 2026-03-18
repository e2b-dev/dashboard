'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/cookies'
import {
  DeleteWebhookSchema,
  UpdateWebhookSecretSchema,
  UpsertWebhookSchema,
} from '@/core/server/functions/webhooks/schema'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'

// Upsert Webhook (Create or Update)

// NOTE: we combine insert and edit for now, since
// the component calling these can be combined as well. [add-edit-dialog.tsx]
// this results in less client side complexity.
export const upsertWebhookAction = authActionClient
  .schema(UpsertWebhookSchema)
  .metadata({ actionName: 'upsertWebhook' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { mode, webhookId, name, url, events, signatureSecret, enabled } =
      parsedInput
    const { session, teamId } = ctx

    const response = await ctx.services.webhooks.upsertWebhook({
      mode: mode === 'add' ? 'create' : 'edit',
      webhookId: webhookId ?? undefined,
      name,
      url,
      events,
      signatureSecret: signatureSecret ?? undefined,
      enabled,
    })

    if (!response.ok) {
      const status = response.error.status

      l.error(
        {
          key:
            mode === 'edit'
              ? 'update_webhook:infra_error'
              : 'create_webhook:infra_error',
          error: response.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            teamId,
            mode,
            name,
            url,
            events,
          },
        },
        `Failed to ${mode === 'edit' ? 'update' : 'create'} webhook: ${status}: ${response.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    const teamSlug = (await cookies()).get(
      COOKIE_KEYS.SELECTED_TEAM_SLUG
    )?.value

    revalidatePath(`/dashboard/${teamSlug}/webhooks`, 'page')

    return { success: true }
  })

// Delete Webhook

export const deleteWebhookAction = authActionClient
  .schema(DeleteWebhookSchema)
  .metadata({ actionName: 'deleteWebhook' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { webhookId } = parsedInput
    const { session, teamId } = ctx

    const response = await ctx.services.webhooks.deleteWebhook(webhookId)

    if (!response.ok) {
      const status = response.error.status

      l.error(
        {
          key: 'delete_webhook:infra_error',
          status,
          error: response.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            teamId,
          },
        },
        `Failed to delete webhook: ${status}: ${response.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    const teamSlug = (await cookies()).get(
      COOKIE_KEYS.SELECTED_TEAM_SLUG
    )?.value

    revalidatePath(`/dashboard/${teamSlug}/webhooks`, 'page')

    return { success: true }
  })

// Update Webhook Secret

export const updateWebhookSecretAction = authActionClient
  .schema(UpdateWebhookSecretSchema)
  .metadata({ actionName: 'updateWebhookSecret' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { webhookId, signatureSecret } = parsedInput
    const { session, teamId } = ctx

    const response = await ctx.services.webhooks.updateWebhookSecret(
      webhookId,
      signatureSecret
    )

    if (!response.ok) {
      const status = response.error.status

      l.error(
        {
          key: 'update_webhook_secret:infra_error',
          error: response.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            teamId,
            webhookId,
          },
        },
        `Failed to update webhook secret: ${status}: ${response.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    const teamSlug = (await cookies()).get(
      COOKIE_KEYS.SELECTED_TEAM_SLUG
    )?.value

    revalidatePath(`/dashboard/${teamSlug}/webhooks`, 'page')

    return { success: true }
  })
