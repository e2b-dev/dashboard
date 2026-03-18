import 'server-only'

import { TRPCError } from '@trpc/server'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import type { SandboxEventModel } from '@/core/domains/sandboxes/models'
import {
  apiError,
  handleDashboardApiError,
  handleInfraApiError,
} from '@/core/server/adapters/trpc-errors'
import { api, infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import type {
  Sandboxes,
  SandboxesMetricsRecord,
  TeamMetric,
} from '@/types/api.types'
import type { components as DashboardComponents } from '@/types/dashboard-api.types'
import type { components as InfraComponents } from '@/types/infra-api.types'

type SandboxesRepositoryDeps = {
  apiClient: typeof api
  infraClient: typeof infra
  authHeaders: typeof SUPABASE_AUTH_HEADERS
}

export interface SandboxesRequestScope {
  accessToken: string
  teamId: string
}

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

export interface SandboxesRepository {
  getSandboxLogs(
    sandboxId: string,
    options?: GetSandboxLogsOptions
  ): Promise<InfraComponents['schemas']['SandboxLogsV2Response']>
  getSandboxDetails(sandboxId: string): Promise<
    | {
        source: 'infra'
        details: InfraComponents['schemas']['SandboxDetail']
      }
    | {
        source: 'database-record'
        details: DashboardComponents['schemas']['SandboxRecord']
      }
  >
  getSandboxLifecycleEvents(sandboxId: string): Promise<SandboxEventModel[]>
  getSandboxMetrics(
    sandboxId: string,
    options: GetSandboxMetricsOptions
  ): Promise<InfraComponents['schemas']['SandboxMetric'][]>
  listSandboxes(): Promise<Sandboxes>
  getSandboxesMetrics(sandboxIds: string[]): Promise<SandboxesMetricsRecord>
  getTeamMetricsRange(
    startUnixSeconds: number,
    endUnixSeconds: number
  ): Promise<TeamMetric[]>
  getTeamMetricsMax(
    startUnixSeconds: number,
    endUnixSeconds: number,
    metric: 'concurrent_sandboxes' | 'sandbox_start_rate'
  ): Promise<InfraComponents['schemas']['MaxTeamMetric']>
}

const SANDBOX_EVENTS_PAGE_SIZE = 100
const SANDBOX_EVENTS_MAX_PAGES = 50
const SANDBOX_LIFECYCLE_EVENT_PREFIX = 'sandbox.lifecycle.'

export function createSandboxesRepository(
  scope: SandboxesRequestScope,
  deps: SandboxesRepositoryDeps = {
    apiClient: api,
    infraClient: infra,
    authHeaders: SUPABASE_AUTH_HEADERS,
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
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!result.response.ok || result.error) {
        const status = result.response.status

        l.error(
          {
            key: 'repositories:sandboxes:get_sandbox_logs:infra_error',
            error: result.error,
            team_id: scope.teamId,
            context: {
              status,
              path: '/v2/sandboxes/{sandboxID}/logs',
              sandbox_id: sandboxId,
            },
          },
          `failed to fetch /v2/sandboxes/{sandboxID}/logs: ${result.error?.message || 'Unknown error'}`
        )

        if (status === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Sandbox not found or you don't have access to it",
          })
        }

        throw apiError(status)
      }

      return result.data
    },
    async getSandboxDetails(sandboxId) {
      const infraResult = await deps.infraClient.GET('/sandboxes/{sandboxID}', {
        params: {
          path: {
            sandboxID: sandboxId,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
        cache: 'no-store',
      })

      if (infraResult.response.ok && infraResult.data) {
        return {
          source: 'infra' as const,
          details: infraResult.data,
        }
      }

      const infraStatus = infraResult.response.status

      if (infraStatus !== 404) {
        handleInfraApiError({
          status: infraStatus,
          error: infraResult.error,
          teamId: scope.teamId,
          path: '/sandboxes/{sandboxID}',
          logKey: 'repositories:sandboxes:get_sandbox_details:infra_error',
          context: {
            sandbox_id: sandboxId,
          },
        })
      }

      const dashboardResult = await deps.apiClient.GET(
        '/sandboxes/{sandboxID}/record',
        {
          params: {
            path: {
              sandboxID: sandboxId,
            },
          },
          headers: {
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
          cache: 'no-store',
        }
      )

      if (dashboardResult.response.ok && dashboardResult.data) {
        return {
          source: 'database-record' as const,
          details: dashboardResult.data,
        }
      }

      const dashboardStatus = dashboardResult.response.status

      if (dashboardStatus === 404) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Sandbox not found or you don't have access to it",
        })
      }

      handleDashboardApiError({
        status: dashboardStatus,
        error: dashboardResult.error,
        teamId: scope.teamId,
        path: '/sandboxes/{sandboxID}/record',
        logKey: 'repositories:sandboxes:get_sandbox_details:fallback_error',
        context: {
          infra_status: infraStatus,
          sandbox_id: sandboxId,
        },
      })
    },
    async getSandboxLifecycleEvents(sandboxId) {
      const lifecycleEvents: SandboxEventModel[] = []

      for (
        let pageIndex = 0, offset = 0;
        pageIndex < SANDBOX_EVENTS_MAX_PAGES;
        pageIndex += 1, offset += SANDBOX_EVENTS_PAGE_SIZE
      ) {
        try {
          const result = await deps.infraClient.GET(
            '/events/sandboxes/{sandboxID}',
            {
              params: {
                path: {
                  sandboxID: sandboxId,
                },
                query: {
                  offset,
                  limit: SANDBOX_EVENTS_PAGE_SIZE,
                  orderAsc: true,
                },
              },
              headers: {
                ...deps.authHeaders(scope.accessToken, scope.teamId),
              },
              cache: 'no-store',
            }
          )

          if (!result.response.ok || result.error) {
            l.warn({
              key: 'repositories:sandboxes:get_sandbox_lifecycle_events:infra_error',
              error: result.error,
              team_id: scope.teamId,
              context: {
                status: result.response.status,
                path: '/events/sandboxes/{sandboxID}',
                sandbox_id: sandboxId,
                offset,
                limit: SANDBOX_EVENTS_PAGE_SIZE,
              },
            })
            break
          }

          const page = result.data ?? []
          lifecycleEvents.push(
            ...page.filter((event) =>
              event.type.startsWith(SANDBOX_LIFECYCLE_EVENT_PREFIX)
            )
          )

          if (page.length < SANDBOX_EVENTS_PAGE_SIZE) {
            break
          }
        } catch (error) {
          l.warn({
            key: 'repositories:sandboxes:get_sandbox_lifecycle_events:infra_exception',
            error,
            team_id: scope.teamId,
            context: {
              path: '/events/sandboxes/{sandboxID}',
              sandbox_id: sandboxId,
              offset,
              limit: SANDBOX_EVENTS_PAGE_SIZE,
            },
          })
          break
        }
      }

      return lifecycleEvents
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
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!result.response.ok || result.error) {
        const status = result.response.status

        l.error(
          {
            key: 'repositories:sandboxes:get_sandbox_metrics:infra_error',
            error: result.error,
            team_id: scope.teamId,
            context: {
              status,
              path: '/sandboxes/{sandboxID}/metrics',
              sandbox_id: sandboxId,
            },
          },
          `failed to fetch /sandboxes/{sandboxID}/metrics: ${result.error?.message || 'Unknown error'}`
        )

        if (status === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Sandbox not found or you don't have access to it",
          })
        }

        throw apiError(status)
      }

      return result.data
    },
    async listSandboxes() {
      const result = await deps.infraClient.GET('/sandboxes', {
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
        cache: 'no-store',
      })

      if (!result.response.ok || result.error) {
        handleInfraApiError({
          status: result.response.status,
          error: result.error,
          teamId: scope.teamId,
          path: '/sandboxes',
          logKey: 'repositories:sandboxes:list_sandboxes:infra_error',
        })
      }

      return result.data
    },
    async getSandboxesMetrics(sandboxIds) {
      const result = await deps.infraClient.GET('/sandboxes/metrics', {
        params: {
          query: {
            sandbox_ids: sandboxIds,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
        cache: 'no-store',
      })

      if (!result.response.ok || result.error) {
        handleInfraApiError({
          status: result.response.status,
          error: result.error,
          teamId: scope.teamId,
          path: '/sandboxes/metrics',
          logKey: 'repositories:sandboxes:get_sandboxes_metrics:infra_error',
          context: { sandbox_ids: sandboxIds },
        })
      }

      return result.data.sandboxes
    },
    async getTeamMetricsRange(startUnixSeconds, endUnixSeconds) {
      const result = await deps.infraClient.GET('/teams/{teamID}/metrics', {
        params: {
          path: {
            teamID: scope.teamId,
          },
          query: {
            start: startUnixSeconds,
            end: endUnixSeconds,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
        cache: 'no-store',
      })

      if (!result.response.ok || result.error) {
        handleInfraApiError({
          status: result.response.status,
          error: result.error,
          teamId: scope.teamId,
          path: '/teams/{teamID}/metrics',
          logKey: 'repositories:sandboxes:get_team_metrics:infra_error',
          context: {
            start_unix_seconds: startUnixSeconds,
            end_unix_seconds: endUnixSeconds,
          },
        })
      }

      return result.data
    },
    async getTeamMetricsMax(startUnixSeconds, endUnixSeconds, metric) {
      const result = await deps.infraClient.GET('/teams/{teamID}/metrics/max', {
        params: {
          path: {
            teamID: scope.teamId,
          },
          query: {
            start: startUnixSeconds,
            end: endUnixSeconds,
            metric,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
        cache: 'no-store',
      })

      if (!result.response.ok || result.error) {
        handleInfraApiError({
          status: result.response.status,
          error: result.error,
          teamId: scope.teamId,
          path: '/teams/{teamID}/metrics/max',
          logKey: 'repositories:sandboxes:get_team_metrics_max:infra_error',
          context: {
            start_unix_seconds: startUnixSeconds,
            end_unix_seconds: endUnixSeconds,
            metric,
          },
        })
      }

      return result.data
    },
  }
}
