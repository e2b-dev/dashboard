import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { transformMetricsToClientMetrics } from '@/lib/utils/sandboxes'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { z } from 'zod'

const GetTeamSandboxesMetricsSchema = z.object({
  teamId: z.string(),
  sandboxIds: z.array(z.string()),
})

export const getTeamSandboxesMetrics = authActionClient
  .metadata({
    serverFunctionName: 'getTeamSandboxesMetrics',
  })
  .schema(GetTeamSandboxesMetricsSchema)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<{
      metrics: ClientSandboxesMetrics
    }> => {
      const { teamId, sandboxIds } = parsedInput
      const { session } = ctx

      if (sandboxIds.length === 0 || USE_MOCK_DATA) {
        return {
          metrics: {},
        }
      }

      const infraRes = await infra.GET('/sandboxes/metrics', {
        params: {
          query: {
            sandbox_ids: sandboxIds,
          },
        },
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        cache: 'no-store',
      })

      if (infraRes.error) {
        const status = infraRes.response.status

        l.error({
          key: 'get_team_sandboxes:infra_error',
          message: infraRes.error.message,
          error: infraRes.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            sandboxIds,
            path: '/sandboxes/metrics',
          },
        })

        return handleDefaultInfraError(status)
      }

      const metrics = transformMetricsToClientMetrics(infraRes.data.sandboxes)

      return {
        metrics,
      }
    }
  )
