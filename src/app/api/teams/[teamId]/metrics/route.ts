import 'server-cli-only'

import { USE_MOCK_DATA } from '@/configs/flags'
import { MOCK_TEAM_METRICS_DATA } from '@/configs/mock-data'
import { l } from '@/lib/clients/logger/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { fetchTeamMetricsWithOverfetch } from '@/server/sandboxes/get-team-metrics'
import { TeamMetricsRequestSchema, TeamMetricsResponse } from './types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params

    const { start, end } = TeamMetricsRequestSchema.parse(await request.json())

    if (USE_MOCK_DATA) {
      const mockData = MOCK_TEAM_METRICS_DATA(start, end)
      return Response.json(mockData satisfies TeamMetricsResponse)
    }

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return Response.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    try {
      // use the new overfetch abstraction
      const result = await fetchTeamMetricsWithOverfetch(
        session.access_token,
        teamId,
        start,
        end
      )

      // log the overfetch metadata for monitoring
      l.info(
        {
          key: 'api_team_metrics:result',
          team_id: teamId,
          user_id: session.user.id,
          overfetch_metadata: result.overfetchMetadata,
          context: {
            path: '/api/teams/[teamId]/metrics',
            requested_range: { start, end },
          },
        },
        'Team metrics API response with overfetch'
      )

      return Response.json({
        metrics: result.metrics,
        step: result.step,
      } satisfies TeamMetricsResponse)
    } catch (error: unknown) {
      const status = error instanceof Response ? error.status : 500

      l.error(
        {
          key: 'api_team_metrics:error',
          error: error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            path: '/api/teams/[teamId]/metrics',
            status,
            start,
            end,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        `Failed to get team metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      return Response.json(
        { error: handleDefaultInfraError(status) },
        { status }
      )
    }
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
