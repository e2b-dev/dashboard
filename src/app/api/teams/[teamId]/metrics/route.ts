import 'server-cli-only'

import { l } from '@/lib/clients/logger/logger'
import { getSessionInsecure } from '@/server/auth/get-session'
import { getTeamMetricsCore } from '@/server/sandboxes/get-team-metrics-core'
import { serializeError } from 'serialize-error'
import { TeamMetricsRequestSchema, TeamMetricsResponse } from './types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params

    const parsedInput = TeamMetricsRequestSchema.safeParse(await request.json())

    if (!parsedInput.success) {
      // should not happen
      l.warn(
        {
          key: 'team_metrics_route_handler:invalid_request',
          error: serializeError(parsedInput.error),
          team_id: teamId,
          context: {
            request: parsedInput.data,
          },
        },
        'team_metrics_route_handler: invalid request'
      )

      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { start: startMs, end: endMs } = parsedInput.data

    const session = await getSessionInsecure()

    if (!session) {
      l.warn(
        {
          key: 'team_metrics_route_handler:unauthenticated',
          team_id: teamId,
        },
        'team_metrics_route_handler: unauthenticated'
      )

      return Response.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const result = await getTeamMetricsCore({
      accessToken: session.access_token,
      teamId,
      userId: session.user.id,
      startMs,
      endMs,
    })

    if (result.error) {
      // error already logged in core function
      return Response.json({ error: result.error }, { status: result.status })
    }

    return Response.json(result.data! satisfies TeamMetricsResponse)
  } catch (error) {
    l.error({
      key: 'team_metrics_route_handler:unexpected_error',
      error: serializeError(error),
    })

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
