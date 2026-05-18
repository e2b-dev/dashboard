import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/core/shared/clients/api'
import type { components as ArgusComponents } from '@/core/shared/contracts/argus-api.types'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { TeamRequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'

type WebhooksRepositoryDeps = {
  infraClient: typeof infra
  authHeaders: typeof SUPABASE_AUTH_HEADERS
}

export type WebhooksScope = TeamRequestScope

export interface UpsertWebhookInput {
  mode: 'create' | 'update'
  webhookId?: string
  name: string
  url: string
  events: string[]
  signatureSecret?: string
  enabled: boolean
}

export interface ListWebhookDeliveriesInput {
  webhookId: string
  limit: number
  cursor?: string
  orderAsc: boolean
  start?: string
  end?: string
  deliveryStatus?: 'success' | 'failed'
  eventType?: string
}

interface ListWebhookDeliveriesResult {
  data: ArgusComponents['schemas']['WebhookDeliveryEvent'][]
  nextCursor: string | null
}

export interface GetWebhookDeliveryInput {
  webhookId: string
  deliveryId: string
}

export interface GetWebhookDeliveryStatsInput {
  webhookId: string
  start?: string
  end?: string
}

export interface WebhooksRepository {
  listWebhooks(): Promise<
    RepoResult<ArgusComponents['schemas']['WebhookDetail'][]>
  >
  getWebhook(
    webhookId: string
  ): Promise<RepoResult<ArgusComponents['schemas']['WebhookDetail']>>
  listWebhookDeliveries(
    input: ListWebhookDeliveriesInput
  ): Promise<RepoResult<ListWebhookDeliveriesResult>>
  getWebhookDelivery(
    input: GetWebhookDeliveryInput
  ): Promise<RepoResult<ArgusComponents['schemas']['WebhookDelivery']>>
  getWebhookDeliveryStats(
    input: GetWebhookDeliveryStatsInput
  ): Promise<RepoResult<ArgusComponents['schemas']['WebhookDeliveryStats']>>
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
    async getWebhook(webhookId) {
      const response = await deps.infraClient.GET(
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
            response.error?.message ?? 'Failed to get webhook',
            response.error
          )
        )
      }

      return ok(response.data)
    },
    async listWebhookDeliveries(input) {
      const deliveryStatus = input.deliveryStatus
        ? [input.deliveryStatus]
        : undefined
      const eventType = input.eventType ? [input.eventType] : undefined
      const response = await deps.infraClient.GET(
        '/events/webhooks/{webhookID}/deliveries',
        {
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
          params: {
            path: { webhookID: input.webhookId },
            query: {
              limit: input.limit,
              cursor: input.cursor,
              orderAsc: input.orderAsc,
              start: input.start,
              end: input.end,
              deliveryStatus,
              eventType,
            },
          },
        }
      )

      if (!response.response.ok || response.error) {
        return err(
          repoErrorFromHttp(
            response.response.status,
            response.error?.message ?? 'Failed to list webhook deliveries',
            response.error
          )
        )
      }

      return ok({
        data: response.data ?? [],
        nextCursor: response.response.headers.get('X-Next-Cursor'),
      })
    },
    async getWebhookDelivery(input) {
      const response = await deps.infraClient.GET(
        '/events/webhooks/{webhookID}/deliveries/{deliveryID}',
        {
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
          params: {
            path: {
              webhookID: input.webhookId,
              deliveryID: input.deliveryId,
            },
          },
        }
      )

      if (!response.response.ok || response.error) {
        return err(
          repoErrorFromHttp(
            response.response.status,
            response.error?.message ?? 'Failed to get webhook delivery',
            response.error
          )
        )
      }

      return ok(response.data)
    },
    async getWebhookDeliveryStats(input) {
      const response = await deps.infraClient.GET(
        '/events/webhooks/{webhookID}/stats',
        {
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
          params: {
            path: { webhookID: input.webhookId },
            query: {
              start: input.start,
              end: input.end,
            },
          },
        }
      )

      if (!response.response.ok || response.error) {
        return err(
          repoErrorFromHttp(
            response.response.status,
            response.error?.message ?? 'Failed to get webhook delivery stats',
            response.error
          )
        )
      }

      return ok(response.data)
    },
    async upsertWebhook(input) {
      if (input.mode === 'update') {
        if (!input.webhookId) {
          return err(
            repoErrorFromHttp(
              400,
              'webhookId is required when updating a webhook'
            )
          )
        }

        const response = await deps.infraClient.PATCH(
          '/events/webhooks/{webhookID}',
          {
            headers: {
              ...deps.authHeaders(scope.accessToken, scope.teamId),
            },
            params: {
              path: { webhookID: input.webhookId },
            },
            body: {
              name: input.name,
              url: input.url,
              events: input.events,
              enabled: input.enabled,
            },
          }
        )

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
      }

      if (!input.signatureSecret) {
        return err(
          repoErrorFromHttp(
            400,
            'signatureSecret is required when creating a webhook'
          )
        )
      }

      const response = await deps.infraClient.POST('/events/webhooks', {
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
        body: {
          name: input.name,
          url: input.url,
          events: input.events,
          enabled: input.enabled,
          signatureSecret: input.signatureSecret,
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
