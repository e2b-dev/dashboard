import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { repoErrorFromHttp } from '@/core/shared/errors'
import { err, ok, type RepoResult } from '@/core/shared/result'
import { infra } from '@/lib/clients/api'
import type { components as ArgusComponents } from '@/types/argus-api.types'

type WebhooksRepositoryDeps = {
  infraClient: typeof infra
  authHeaders: typeof SUPABASE_AUTH_HEADERS
}

export interface WebhooksScope {
  accessToken: string
  teamId: string
}

export interface UpsertWebhookInput {
  mode: 'create' | 'edit'
  webhookId?: string
  name: string
  url: string
  events: string[]
  signatureSecret?: string
  enabled: boolean
}

export interface WebhooksRepository {
  listWebhooks(): Promise<
    RepoResult<ArgusComponents['schemas']['WebhookDetail'][]>
  >
  upsertWebhook(input: UpsertWebhookInput): Promise<RepoResult<void>>
  deleteWebhook(webhookId: string): Promise<RepoResult<void>>
  updateWebhookSecret(
    webhookId: string,
    signatureSecret: string
  ): Promise<RepoResult<void>>
}

export function createWebhooksRepository(
  scope: WebhooksScope,
  deps: WebhooksRepositoryDeps = {
    infraClient: infra,
    authHeaders: SUPABASE_AUTH_HEADERS,
  }
): WebhooksRepository {
  return {
    async listWebhooks() {
      const response = await deps.infraClient.GET('/events/webhooks', {
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!response.response.ok || response.error) {
        if (response.response.status === 404) {
          return ok([])
        }

        return err(
          repoErrorFromHttp(
            response.response.status,
            response.error?.message ?? 'Failed to list webhooks',
            response.error
          )
        )
      }

      return ok(response.data ?? [])
    },
    async upsertWebhook(input) {
      const response =
        input.mode === 'edit'
          ? await deps.infraClient.PATCH('/events/webhooks/{webhookID}', {
              headers: {
                ...deps.authHeaders(scope.accessToken, scope.teamId),
              },
              params: {
                path: { webhookID: input.webhookId ?? '' },
              },
              body: {
                name: input.name,
                url: input.url,
                events: input.events,
                enabled: input.enabled,
              },
            })
          : await deps.infraClient.POST('/events/webhooks', {
              headers: {
                ...deps.authHeaders(scope.accessToken, scope.teamId),
              },
              body: {
                name: input.name,
                url: input.url,
                events: input.events,
                enabled: input.enabled,
                signatureSecret: input.signatureSecret ?? '',
              },
            })

      if (!response.response.ok || response.error) {
        return err(
          repoErrorFromHttp(
            response.response.status,
            response.error?.message ?? 'Failed to upsert webhook',
            response.error
          )
        )
      }

      return ok(undefined)
    },
    async deleteWebhook(webhookId) {
      const response = await deps.infraClient.DELETE(
        '/events/webhooks/{webhookID}',
        {
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
          params: {
            path: { webhookID: webhookId },
          },
        }
      )

      if (!response.response.ok || response.error) {
        return err(
          repoErrorFromHttp(
            response.response.status,
            response.error?.message ?? 'Failed to delete webhook',
            response.error
          )
        )
      }

      return ok(undefined)
    },
    async updateWebhookSecret(webhookId, signatureSecret) {
      const response = await deps.infraClient.PATCH(
        '/events/webhooks/{webhookID}',
        {
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
          params: {
            path: { webhookID: webhookId },
          },
          body: {
            signatureSecret,
          },
        }
      )

      if (!response.response.ok || response.error) {
        return err(
          repoErrorFromHttp(
            response.response.status,
            response.error?.message ?? 'Failed to update webhook secret',
            response.error
          )
        )
      }

      return ok(undefined)
    },
  }
}
