import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { api, infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { TRPCError } from '@trpc/server'
import {
  apiError,
  handleDashboardApiError,
  handleInfraApiError,
} from '../errors'

// get sandbox logs

export interface GetSandboxLogsOptions {
  cursor?: number
  limit?: number
  direction?: 'forward' | 'backward'
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
      source: 'dashboard-log' as const,
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

export const sandboxesRepo = {
  getSandboxLogs,
  getSandboxDetails,
}
