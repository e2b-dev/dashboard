import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { z } from 'zod'

export const GetTeamMetricsSchema = z.object({
  teamId: z.string().uuid(),
  startDate: z
    .number()
    .int()
    .positive()
    .describe('Unix timestamp in milliseconds'),
  endDate: z
    .number()
    .int()
    .positive()
    .describe('Unix timestamp in milliseconds'),
})

export const getTeamMetrics = authActionClient
  .schema(GetTeamMetricsSchema)
  .metadata({ serverFunctionName: 'getTeamMetrics' })
  .action(async ({ parsedInput, ctx }) => {
    const { session } = ctx
    const { teamId, startDate, endDate } = parsedInput

    const res = await infra.GET('/teams/{teamID}/metrics', {
      params: {
        path: {
          teamID: teamId,
        },
        query: {
          start: startDate,
          end: endDate,
        },
      },

      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      cache: 'no-store',
    })

    if (res.error) {
      const status = res.response.status

      l.error({
        key: 'get_team_metrics:infra_error',
        message: res.error.message,
        error: res.error,
        team_id: teamId,
        user_id: session.user.id,
        context: {
          status,
          startDate,
          endDate,
        },
      })

      return handleDefaultInfraError(status)
    }

    return res.data
  })
