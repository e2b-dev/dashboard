import 'server-cli-only'

import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { getTeamMetricsCore } from '@/core/server/functions/sandboxes/get-team-metrics-core'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getPublicErrorMessage } from '@/core/shared/errors'
import { TeamMetricsRequestSchema, type TeamMetricsResponse } from './types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamSlug: string }> }
) {
  try {
    const { teamSlug } = await params

    const parsedInput = TeamMetricsRequestSchema.safeParse(await request.json())

    if (!parsedInput.success) {
      // should not happen
      l.warn(
        {
          key: 'team_metrics_route_handler:invalid_request',
          error: serializeErrorForLog(parsedInput.error),
          team_slug: teamSlug,
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
          team_slug: teamSlug,
        },
        'team_metrics_route_handler: unauthenticated'
      )

      return Response.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const teamId = await getTeamIdFromSlug(teamSlug, session.access_token)

    if (!teamId) {
      l.warn(
        {
          key: 'team_metrics_route_handler:forbidden_team',
          team_slug: teamSlug,
          user_id: session.user.id,
        },
        'team_metrics_route_handler: forbidden team'
      )

      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await getTeamMetricsCore({
      accessToken: session.access_token,
      teamId,
      userId: session.user.id,
      startMs,
      endMs,
    })

    if (result.error) {
      const safeMessage = getPublicErrorMessage({ status: result.status })
      return Response.json({ error: safeMessage }, { status: result.status })
    }

    return Response.json(result.data! satisfies TeamMetricsResponse)
  } catch (error) {
    l.error({
      key: 'team_metrics_route_handler:unexpected_error',
      error: serializeErrorForLog(error),
    })

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
