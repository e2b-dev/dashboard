import 'server-cli-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_TEAM_METRICS_DATA,
} from '@/configs/mock-data'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { handleDefaultInfraError } from '@/lib/utils/action'
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

    const startSeconds = Math.floor(start / 1000)
    const endSeconds = Math.floor(end / 1000)

    // calculate step to determine overfetch amount
    const step = calculateTeamMetricsStep(start, end)

    const overfetchSeconds = Math.ceil(step / 1000) // overfetch by one step

    try {
      const res = await infra.GET('/teams/{teamID}/metrics', {
        params: {
          path: {
            teamID: teamId,
          },
          query: {
            start: startSeconds,
            end: endSeconds + overfetchSeconds, // overfetch to capture boundary points
          },
        },
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        cache: 'no-store',
      })

      if (res.error) {
        throw res.error
      }

      // transform timestamps and filter to requested range (with tolerance)
      // allow data points up to half a step beyond the end for boundary cases
      const tolerance = step * 0.5
      const metrics = res.data
        .map((d) => ({
          ...d,
          timestamp: new Date(d.timestamp).getTime(),
        }))
        .filter((d) => d.timestamp >= start && d.timestamp <= end + tolerance)

      l.info(
        {
          key: 'api_team_metrics:result',
          team_id: teamId,
          user_id: session.user.id,
          context: {
            path: '/api/teams/[teamId]/metrics',
            requested_range: { start, end },
            data_points: metrics.length,
            step,
            overfetch_seconds: overfetchSeconds,
          },
        },
        'Team metrics API response'
      )

      return Response.json({
        metrics,
        step,
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
