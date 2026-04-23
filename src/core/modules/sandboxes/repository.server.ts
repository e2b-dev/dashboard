import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import type { components as DashboardComponents } from '@/contracts/dashboard-api'
import type { components as InfraComponents } from '@/contracts/infra-api'
import type { SandboxLifecycleEventType } from '@/core/modules/sandboxes/lifecycle-event-types'
import type {
  SandboxEventModel,
  Sandboxes,
  SandboxesMetricsRecord,
  TeamMetric,
} from '@/core/modules/sandboxes/models'
import { api, infra } from '@/core/shared/clients/api'
import { l } from '@/core/shared/clients/logger/logger'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { TeamRequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'

type SandboxesRepositoryDeps = {
  apiClient: typeof api
  infraClient: typeof infra
  authHeaders: typeof SUPABASE_AUTH_HEADERS
}

export type SandboxesRequestScope = TeamRequestScope

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

interface ListSandboxLifecycleEventsOptions {
  offset?: number
  limit?: number
  orderAsc?: boolean
  types?: SandboxLifecycleEventType[]
}

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
  getSandboxLifecycleEvents(
    sandboxId: string
  ): Promise<RepoResult<SandboxEventModel[]>>
  getSandboxMetrics(
    sandboxId: string,
    options: GetSandboxMetricsOptions
  ): Promise<RepoResult<InfraComponents['schemas']['SandboxMetric'][]>>
  listSandboxes(): Promise<RepoResult<Sandboxes>>
  getSandboxesMetrics(
    sandboxIds: string[]
  ): Promise<RepoResult<SandboxesMetricsRecord>>
  getTeamMetricsRange(
    startUnixSeconds: number,
    endUnixSeconds: number
  ): Promise<RepoResult<TeamMetric[]>>
  getTeamMetricsMax(
    startUnixSeconds: number,
    endUnixSeconds: number,
    metric: 'concurrent_sandboxes' | 'sandbox_start_rate'
  ): Promise<RepoResult<InfraComponents['schemas']['MaxTeamMetric']>>
}

const SANDBOX_NOT_FOUND_MESSAGE =
  "Sandbox not found or you don't have access to it"
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
  /** Fetches one sandbox lifecycle events page. Example: { offset: 20, limit: 20 } -> the next 20 events. */
  const listSandboxLifecycleEventsPage = async (
    sandboxId: string,
    options: ListSandboxLifecycleEventsOptions = {}
  ): Promise<RepoResult<SandboxEventModel[]>> => {
    const result = await deps.infraClient.GET('/events/sandboxes/{sandboxID}', {
      params: {
        path: {
          sandboxID: sandboxId,
        },
        query: {
          offset: options.offset,
          limit: options.limit,
          orderAsc: options.orderAsc,
          types: options.types,
        },
      },
      headers: {
        ...deps.authHeaders(scope.accessToken, scope.teamId),
      },
      cache: 'no-store',
    })

    if (!result.response.ok || result.error) {
      const status = result.response.status

      l.error({
        key: 'repositories:sandboxes:list_sandbox_lifecycle_events:infra_error',
        error: result.error,
        team_id: scope.teamId,
        context: {
          status,
          path: '/events/sandboxes/{sandboxID}',
          sandbox_id: sandboxId,
          offset: options.offset,
          limit: options.limit,
          order_asc: options.orderAsc,
          types: options.types,
        },
      })

      return err(
        repoErrorFromHttp(
          status,
          status === 404
            ? SANDBOX_NOT_FOUND_MESSAGE
            : (result.error?.message ??
                'Failed to fetch sandbox lifecycle events'),
          result.error
        )
      )
    }

    return ok(result.data ?? [])
  }

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
          ...deps.authHeaders(scope.accessToken, scope.teamId),
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
          team_id: scope.teamId,
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
        return ok({
          source: 'database-record' as const,
          details: dashboardResult.data,
        })
      }

      const dashboardStatus = dashboardResult.response.status

      if (dashboardStatus === 404) {
        return err(repoErrorFromHttp(404, SANDBOX_NOT_FOUND_MESSAGE))
      }

      l.error({
        key: 'repositories:sandboxes:get_sandbox_details:fallback_error',
        error: dashboardResult.error,
        team_id: scope.teamId,
        context: {
          status: dashboardStatus,
          path: '/sandboxes/{sandboxID}/record',
          infra_status: infraStatus,
          sandbox_id: sandboxId,
        },
      })
      return err(
        repoErrorFromHttp(
          dashboardStatus,
          dashboardResult.error?.message ?? 'Failed to fetch sandbox details',
          dashboardResult.error
        )
      )
    },
    async getSandboxLifecycleEvents(sandboxId) {
      const lifecycleEvents: SandboxEventModel[] = []

      for (
        let pageIndex = 0, offset = 0;
        pageIndex < SANDBOX_EVENTS_MAX_PAGES;
        pageIndex += 1, offset += SANDBOX_EVENTS_PAGE_SIZE
      ) {
        const result = await listSandboxLifecycleEventsPage(sandboxId, {
          offset,
          limit: SANDBOX_EVENTS_PAGE_SIZE,
          orderAsc: true,
        })

        if (!result.ok) {
          l.warn({
            key: 'repositories:sandboxes:get_sandbox_lifecycle_events:infra_error',
            error: result.error,
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

        const page = result.data
        lifecycleEvents.push(
          ...page.filter((event) =>
            event.type.startsWith(SANDBOX_LIFECYCLE_EVENT_PREFIX)
          )
        )

        if (page.length < SANDBOX_EVENTS_PAGE_SIZE) {
          break
        }
      }

      return ok(lifecycleEvents)
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
    async listSandboxes() {
      const result = await deps.infraClient.GET('/sandboxes', {
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
        cache: 'no-store',
      })

      if (!result.response.ok || result.error) {
        l.error({
          key: 'repositories:sandboxes:list_sandboxes:infra_error',
          error: result.error,
          team_id: scope.teamId,
          context: {
            status: result.response.status,
            path: '/sandboxes',
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

      return ok(result.data)
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
        l.error({
          key: 'repositories:sandboxes:get_sandboxes_metrics:infra_error',
          error: result.error,
          team_id: scope.teamId,
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
        l.error({
          key: 'repositories:sandboxes:get_team_metrics:infra_error',
          error: result.error,
          team_id: scope.teamId,
          context: {
            status: result.response.status,
            path: '/teams/{teamID}/metrics',
            start_unix_seconds: startUnixSeconds,
            end_unix_seconds: endUnixSeconds,
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to fetch team metrics',
            result.error
          )
        )
      }

      return ok(result.data)
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
        l.error({
          key: 'repositories:sandboxes:get_team_metrics_max:infra_error',
          error: result.error,
          team_id: scope.teamId,
          context: {
            status: result.response.status,
            path: '/teams/{teamID}/metrics/max',
            start_unix_seconds: startUnixSeconds,
            end_unix_seconds: endUnixSeconds,
            metric,
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to fetch team metrics max',
            result.error
          )
        )
      }

      return ok(result.data)
    },
  }
}
