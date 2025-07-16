import { z } from 'zod'
import { authActionClient } from '@/lib/clients/action'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { logError } from '@/lib/clients/logger'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { transformMetricsToClientMetrics } from '@/lib/utils/sandboxes'
import { infra } from '@/lib/clients/api'

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

      if (
        sandboxIds.length === 0 ||
        process.env.NEXT_PUBLIC_MOCK_DATA === '1'
      ) {
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

        logError('/sandboxes/metrics', status, infraRes.error, infraRes.data)

        return handleDefaultInfraError(status)
      }

      const metrics = transformMetricsToClientMetrics(infraRes.data.sandboxes)

      return {
        metrics,
      }
    }
  )
