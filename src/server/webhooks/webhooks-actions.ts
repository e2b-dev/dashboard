'use server'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { COOKIE_KEYS } from '@/configs/keys'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import {
  DeleteWebhookSchema,
  UpdateWebhookSecretSchema,
  UpsertWebhookSchema,
} from './schema'

// Upsert Webhook (Create or Update)

// NOTE: we combine insert and edit for now, since
// the component calling these can be combined as well. [add-edit-dialog.tsx]
// this results in less client side complexity.
export const upsertWebhookAction = authActionClient
  .schema(UpsertWebhookSchema)
  .metadata({ actionName: 'upsertWebhook' })
  .action(async ({ parsedInput, ctx }) => {
    const {
      teamId,
      mode,
      webhookId,
      name,
      url,
      events,
      signatureSecret,
      enabled,
    } = parsedInput
    const { session } = ctx

    const accessToken = session.access_token
    const isEdit = mode === 'edit'

    const response = isEdit
      ? await infra.PATCH('/events/webhooks/{webhookID}', {
          headers: {
            ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
          },
          params: {
            path: { webhookID: webhookId! },
          },
          body: {
            name,
            url,
            events,
            enabled,
            ...(signatureSecret ? { signatureSecret } : {}),
          },
        })
      : await infra.POST('/events/webhooks', {
          headers: {
            ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
          },
          body: {
            name,
            url,
            events,
            enabled,
            signatureSecret: signatureSecret!,
          },
        })

    if (response.error) {
      const status = response.response.status

      l.error(
        {
          key: isEdit
            ? 'update_webhook:infra_error'
            : 'create_webhook:infra_error',
          status,
          error: response.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            teamId,
            mode,
            name,
            url,
            events,
            signatureSecret,
          },
        },
        `Failed to ${isEdit ? 'update' : 'create'} webhook: ${status}: ${response.error.message}`
      )

      return handleDefaultInfraError(status)
    }

    const teamSlug = (await cookies()).get(
      COOKIE_KEYS.SELECTED_TEAM_SLUG
    )?.value

    revalidatePath(`/dashboard/${teamSlug}/settings?tab=webhooks`, 'page')

    return { success: true }
  })

// Delete Webhook

export const deleteWebhookAction = authActionClient
  .schema(DeleteWebhookSchema)
  .metadata({ actionName: 'deleteWebhook' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, webhookId } = parsedInput
    const { session } = ctx

    const accessToken = session.access_token

    const response = await infra.DELETE('/events/webhooks/{webhookID}', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      params: {
        path: { webhookID: webhookId },
      },
    })

    if (response.error) {
      const status = response.response.status

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

    revalidatePath(`/dashboard/${teamSlug}/settings?tab=webhooks`, 'page')

    return { success: true }
  })

// Update Webhook Secret

export const updateWebhookSecretAction = authActionClient
  .schema(UpdateWebhookSecretSchema)
  .metadata({ actionName: 'updateWebhookSecret' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, webhookId, signatureSecret } = parsedInput
    const { session } = ctx

    const accessToken = session.access_token

    const response = await infra.PATCH('/events/webhooks/{webhookID}', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      params: {
        path: { webhookID: webhookId },
      },
      body: {
        signatureSecret,
      },
    })

    if (response.error) {
      const status = response.response.status

      l.error(
        {
          key: 'update_webhook_secret:infra_error',
          status,
          error: response.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
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

    revalidatePath(`/dashboard/${teamSlug}/settings?tab=webhooks`, 'page')

    return { success: true }
  })
