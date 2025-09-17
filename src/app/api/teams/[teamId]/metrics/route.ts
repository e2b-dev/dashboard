import 'server-cli-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_TEAM_METRICS_DATA,
} from '@/configs/mock-data'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { getSessionInsecure } from '@/server/auth/get-session'
import { TeamMetricsRequestSchema, TeamMetricsResponse } from './types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params

    const parsedInput = TeamMetricsRequestSchema.safeParse(await request.json())

    if (!parsedInput.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { start: startMs, end: endMs } = parsedInput.data

    if (USE_MOCK_DATA) {
      const mockData = MOCK_TEAM_METRICS_DATA(startMs, endMs)
      return Response.json(mockData satisfies TeamMetricsResponse)
    }

    // fine to use here, we only need a token for the infra api request. it will validate the token.
    const session = await getSessionInsecure()

    if (!session) {
      return Response.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const startS = Math.floor(startMs / 1000)
    const endS = Math.floor(endMs / 1000)

    // calculate step to determine overfetch amount
    const stepMs = calculateTeamMetricsStep(startMs, endMs)

    // overfetch by one step
    // the overfetch is accounted for when post=processing the data using fillTeamMetricsWithZeros

    // TODO: refactor the overfetch handling, to make this behavior more explicit
    const stepS = Math.ceil(stepMs / 1000)

    const res = await infra.GET('/teams/{teamID}/metrics', {
      params: {
        path: {
          teamID: teamId,
        },
        query: {
          start: startS,
          end: endS + stepS,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      cache: 'no-store',
    })

    if (res.error) {
      const status = res.response.status

      l.error(
        {
          key: 'route_handler_team_metrics:infra_error',
          error: res.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            startMs,
            endMs,
            stepMs,
            stepS,
          },
        },
        `Route /teams/[teamId]/metrics failed to get team metrics: ${res.error.message}`
      )

      const message = handleDefaultInfraError(status)

      return Response.json({ error: message }, { status })
    }

    const metrics = res.data.map((d) => ({
      concurrentSandboxes: d.concurrentSandboxes,
      sandboxStartRate: d.sandboxStartRate,
      timestamp: d.timestampUnix * 1000, // since javascript timestamps are in milliseconds, we want to convert the timestamp back to milliseconds
    }))

    l.info(
      {
        key: 'route_handler_team_metrics:result',
        team_id: teamId,
        user_id: session.user.id,
        context: {
          path: '/api/teams/[teamId]/metrics',
          requestedRangeMs: { startMs, endMs },
          dataPoints: metrics.length,
          stepMs,
          overfetchSeconds: stepS,
        },
      },
      'Route /teams/[teamId]/metrics successfully fetched team metrics'
    )

    return Response.json({
      metrics,
      step: stepMs,
    } satisfies TeamMetricsResponse)
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
