import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import { MOCK_SANDBOXES_DATA } from '@/configs/mock-data'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { createInfraTRPCError } from '@/lib/utils/trpc'
import { createTRPCRouter, teamProcedure } from '@/server/api/trpc'
import { transformMetricsToClientMetrics } from '@/server/sandboxes/utils'
import { z } from 'zod'

export const sandboxesRouter = createTRPCRouter({
  // QUERIES
  getSandboxes: teamProcedure.query(async ({ ctx }) => {
    const { session, teamId } = ctx

    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200))

      const sandboxes = MOCK_SANDBOXES_DATA()

      return {
        sandboxes,
      }
    }

    const sandboxesRes = await infra.GET('/sandboxes', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      cache: 'no-store',
    })

    if (sandboxesRes.error) {
      const status = sandboxesRes.response.status

      l.error(
        {
          key: 'get_team_sandboxes:infra_error',
          error: sandboxesRes.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
          },
        },
        `Failed to get team sandboxes: ${sandboxesRes.error.message}`
      )

      throw createInfraTRPCError(status)
    }

    return {
      sandboxes: sandboxesRes.data,
    }
  }),

  getSandboxesMetrics: teamProcedure
    .input(
      z.object({
        sandboxIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session, teamId } = ctx
      const { sandboxIds } = input

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

        throw createInfraTRPCError(status)
      }

      const metrics = transformMetricsToClientMetrics(infraRes.data.sandboxes)

      return {
        metrics,
      }
    }),

  // MUTATIONS
})
