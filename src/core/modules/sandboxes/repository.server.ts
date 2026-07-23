import 'server-only'

import { apiKeyHeaders } from '@/configs/api'
import type { components as DashboardComponents } from '@/contracts/dashboard-api'
import type { components as InfraComponents } from '@/contracts/infra-api'
import type {
  Sandboxes,
  SandboxesMetricsRecord,
  SandboxState,
} from '@/core/modules/sandboxes/models'
import { api, infra } from '@/core/shared/clients/api'
import { l } from '@/core/shared/clients/logger/logger'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { RequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'

type SandboxesRepositoryDeps = {
  apiClient: typeof api
  infraClient: typeof infra
  apiKeyHeaders: typeof apiKeyHeaders
}

export type SandboxesRequestScope = RequestScope

export interface GetSandboxLogsOptions {
  cursor?: number
  limit?: number
  direction?: 'forward' | 'backward'
  level?: 'debug' | 'info' | 'warn' | 'error'
  search?: string
}

export interface GetSandboxMetricsOptions {
  startUnixMs: number
  endUnixMs: number
}

export interface ListSandboxesOptions {
  cursor?: string
  limit: number
  states?: SandboxState[]
}

export interface ListSandboxesResult {
  sandboxes: Sandboxes
  nextCursor: string | null
}

const DEFAULT_SANDBOX_STATES: SandboxState[] = ['running', 'paused']

export interface SandboxesRepository {
  getSandboxLogs(
    sandboxId: string,
    options?: GetSandboxLogsOptions
  ): Promise<RepoResult<InfraComponents['schemas']['SandboxLogsV2Response']>>
  getSandboxDetails(sandboxId: string): Promise<
    RepoResult<
      | {
          source: 'infra'
          details: InfraComponents['schemas']['SandboxDetail']
        }
      | {
          source: 'database-record'
          details: DashboardComponents['schemas']['SandboxRecord']
        }
    >
  >
  getSandboxMetrics(
    sandboxId: string,
    options: GetSandboxMetricsOptions
  ): Promise<RepoResult<InfraComponents['schemas']['SandboxMetric'][]>>
  listSandboxesPaginated(
    options: ListSandboxesOptions
  ): Promise<RepoResult<ListSandboxesResult>>
  getSandboxesMetrics(
    sandboxIds: string[]
  ): Promise<RepoResult<SandboxesMetricsRecord>>
}

const SANDBOX_NOT_FOUND_MESSAGE =
  "Sandbox not found or you don't have access to it"

export function createSandboxesRepository(
  scope: SandboxesRequestScope,
  deps: SandboxesRepositoryDeps = {
    apiClient: api,
    infraClient: infra,
    apiKeyHeaders: apiKeyHeaders,
  }
): SandboxesRepository {
  return {
    async getSandboxLogs(sandboxId, options = {}) {
      const result = await deps.infraClient.GET(
        '/v2/sandboxes/{sandboxID}/logs',
        {
          params: {
            path: {
              sandboxID: sandboxId,
            },
            query: {
              cursor: options.cursor,
              limit: options.limit,
              direction: options.direction,
              level: options.level,
              search: options.search,
            },
          },
          headers: {
            ...deps.apiKeyHeaders(scope.apiKey),
          },
        }
      )

      if (!result.response.ok || result.error) {
        const status = result.response.status

        l.error(
          {
            key: 'repositories:sandboxes:get_sandbox_logs:infra_error',
            error: result.error,
            context: {
              status,
              path: '/v2/sandboxes/{sandboxID}/logs',
              sandbox_id: sandboxId,
            },
          },
          `failed to fetch /v2/sandboxes/{sandboxID}/logs: ${result.error?.message || 'Unknown error'}`
        )

        return err(
          repoErrorFromHttp(
            status,
            status === 404
              ? SANDBOX_NOT_FOUND_MESSAGE
              : (result.error?.message ?? 'Failed to fetch sandbox logs'),
            result.error
          )
        )
      }

      return ok(result.data)
    },
    async getSandboxDetails(sandboxId) {
      const infraResult = await deps.infraClient.GET('/sandboxes/{sandboxID}', {
        params: {
          path: {
            sandboxID: sandboxId,
          },
        },
        headers: {
          ...deps.apiKeyHeaders(scope.apiKey),
        },
        cache: 'no-store',
      })

      if (infraResult.response.ok && infraResult.data) {
        return ok({
          source: 'infra' as const,
          details: infraResult.data,
        })
      }

      const infraStatus = infraResult.response.status

      if (infraStatus !== 404) {
        l.error({
          key: 'repositories:sandboxes:get_sandbox_details:infra_error',
          error: infraResult.error,
          context: {
            status: infraStatus,
            path: '/sandboxes/{sandboxID}',
            sandbox_id: sandboxId,
          },
        })
        return err(
          repoErrorFromHttp(
            infraStatus,
            infraResult.error?.message ?? 'Failed to fetch sandbox details',
            infraResult.error
          )
        )
      }

      // OSS: the dashboard-api killed-sandbox archival record endpoint
      // (`GET /sandboxes/{sandboxID}/record`) is not available; we assume a
      // 404 without calling it. The `database-record` source and its models
      // are kept for parity with console.
      return err(repoErrorFromHttp(404, SANDBOX_NOT_FOUND_MESSAGE))
    },
    async getSandboxMetrics(sandboxId, options) {
      const startUnixSeconds = Math.floor(options.startUnixMs / 1000)
      const endUnixSeconds = Math.floor(options.endUnixMs / 1000)

      const result = await deps.infraClient.GET(
        '/sandboxes/{sandboxID}/metrics',
        {
          params: {
            path: {
              sandboxID: sandboxId,
            },
            query: {
              start: startUnixSeconds,
              end: endUnixSeconds,
            },
          },
          headers: {
            ...deps.apiKeyHeaders(scope.apiKey),
          },
        }
      )

      if (!result.response.ok || result.error) {
        const status = result.response.status

        l.error(
          {
            key: 'repositories:sandboxes:get_sandbox_metrics:infra_error',
            error: result.error,
            context: {
              status,
              path: '/sandboxes/{sandboxID}/metrics',
              sandbox_id: sandboxId,
            },
          },
          `failed to fetch /sandboxes/{sandboxID}/metrics: ${result.error?.message || 'Unknown error'}`
        )

        return err(
          repoErrorFromHttp(
            status,
            status === 404
              ? SANDBOX_NOT_FOUND_MESSAGE
              : (result.error?.message ?? 'Failed to fetch sandbox metrics'),
            result.error
          )
        )
      }

      return ok(result.data)
    },
    async listSandboxesPaginated(options) {
      const result = await deps.infraClient.GET('/v2/sandboxes', {
        params: {
          query: {
            state: options.states ?? DEFAULT_SANDBOX_STATES,
            nextToken: options.cursor,
            limit: options.limit,
          },
        },
        headers: {
          ...deps.apiKeyHeaders(scope.apiKey),
        },
        cache: 'no-store',
      })

      if (!result.response.ok || result.error) {
        l.error({
          key: 'repositories:sandboxes:list_sandboxes_paginated:infra_error',
          error: result.error,
          context: {
            status: result.response.status,
            path: '/v2/sandboxes',
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to list sandboxes',
            result.error
          )
        )
      }

      return ok({
        sandboxes: result.data ?? [],
        nextCursor: result.response.headers.get('x-next-token') || null,
      })
    },
    async getSandboxesMetrics(sandboxIds) {
      const result = await deps.infraClient.GET('/sandboxes/metrics', {
        params: {
          query: {
            sandbox_ids: sandboxIds,
          },
        },
        headers: {
          ...deps.apiKeyHeaders(scope.apiKey),
        },
        cache: 'no-store',
      })

      if (!result.response.ok || result.error) {
        l.error({
          key: 'repositories:sandboxes:get_sandboxes_metrics:infra_error',
          error: result.error,
          context: {
            status: result.response.status,
            path: '/sandboxes/metrics',
            sandbox_ids: sandboxIds,
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to fetch sandboxes metrics',
            result.error
          )
        )
      }

      return ok(result.data.sandboxes)
    },
  }
}
