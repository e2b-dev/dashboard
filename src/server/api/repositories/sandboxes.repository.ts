import { TRPCError } from '@trpc/server'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { api, infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import {
  apiError,
  handleDashboardApiError,
  handleInfraApiError,
} from '../errors'
import type { SandboxEventDTO } from '../models/sandboxes.models'

// get sandbox logs

export interface GetSandboxLogsOptions {
  cursor?: number
  limit?: number
  direction?: 'forward' | 'backward'
  level?: 'debug' | 'info' | 'warn' | 'error'
  search?: string
}

export async function getSandboxLogs(
  accessToken: string,
  teamId: string,
  sandboxId: string,
  options: GetSandboxLogsOptions = {}
) {
  const result = await infra.GET('/v2/sandboxes/{sandboxID}/logs', {
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
      ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
    },
  })

  if (!result.response.ok || result.error) {
    const status = result.response.status

    l.error(
      {
        key: 'repositories:sandboxes:get_sandbox_logs:infra_error',
        error: result.error,
        team_id: teamId,
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
}

export async function getSandboxDetails(
  accessToken: string,
  teamId: string,
  sandboxId: string
) {
  const infraResult = await infra.GET('/sandboxes/{sandboxID}', {
    params: {
      path: {
        sandboxID: sandboxId,
      },
    },
    headers: {
      ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
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
      teamId,
      path: '/sandboxes/{sandboxID}',
      logKey: 'repositories:sandboxes:get_sandbox_details:infra_error',
      context: {
        sandbox_id: sandboxId,
      },
    })
  }

  const dashboardResult = await api.GET('/sandboxes/{sandboxID}/record', {
    params: {
      path: {
        sandboxID: sandboxId,
      },
    },
    headers: {
      ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
    },
    cache: 'no-store',
  })

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
    teamId,
    path: '/sandboxes/{sandboxID}/record',
    logKey: 'repositories:sandboxes:get_sandbox_details:fallback_error',
    context: {
      infra_status: infraStatus,
      sandbox_id: sandboxId,
    },
  })
}

const SANDBOX_EVENTS_PAGE_SIZE = 100
const SANDBOX_EVENTS_MAX_PAGES = 50
const SANDBOX_LIFECYCLE_EVENT_PREFIX = 'sandbox.lifecycle.'

export async function getSandboxLifecycleEvents(
  accessToken: string,
  teamId: string,
  sandboxId: string
) {
  const lifecycleEvents: SandboxEventDTO[] = []

  for (
    let pageIndex = 0, offset = 0;
    pageIndex < SANDBOX_EVENTS_MAX_PAGES;
    pageIndex += 1, offset += SANDBOX_EVENTS_PAGE_SIZE
  ) {
    try {
      const result = await infra.GET('/events/sandboxes/{sandboxID}', {
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
          ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
        },
        cache: 'no-store',
      })

      if (!result.response.ok || result.error) {
        l.warn({
          key: 'repositories:sandboxes:get_sandbox_lifecycle_events:infra_error',
          error: result.error,
          team_id: teamId,
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
        team_id: teamId,
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
}

// get sandbox metrics

export interface GetSandboxMetricsOptions {
  startUnixMs: number
  endUnixMs: number
}

export async function getSandboxMetrics(
  accessToken: string,
  teamId: string,
  sandboxId: string,
  options: GetSandboxMetricsOptions
) {
  // convert milliseconds to seconds for the API
  const startUnixSeconds = Math.floor(options.startUnixMs / 1000)
  const endUnixSeconds = Math.floor(options.endUnixMs / 1000)

  const result = await infra.GET('/sandboxes/{sandboxID}/metrics', {
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
      ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
    },
  })

  if (!result.response.ok || result.error) {
    const status = result.response.status

    l.error(
      {
        key: 'repositories:sandboxes:get_sandbox_metrics:infra_error',
        error: result.error,
        team_id: teamId,
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
}

export const sandboxesRepo = {
  getSandboxLogs,
  getSandboxDetails,
  getSandboxLifecycleEvents,
  getSandboxMetrics,
}
