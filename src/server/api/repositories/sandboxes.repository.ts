import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { TRPCError } from '@trpc/server'
import { apiError } from '../errors'

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

export const sandboxesRepo = {
  getSandboxLogs,
}
