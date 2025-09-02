import 'server-cli-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
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

    // convert milliseconds to seconds
    const startSeconds = Math.floor(start / 1000)
    const endSeconds = Math.floor(end / 1000)

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return Response.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const infraRes = await infra.GET('/teams/{teamID}/metrics', {
      params: {
        path: {
          teamID: teamId,
        },
        query: {
          start: startSeconds,
          end: endSeconds,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      cache: 'no-store',
    })

    if (infraRes.error) {
      const status = infraRes.response.status

      l.error(
        {
          key: 'get_team_sandboxes_metrics',
          message: infraRes.error.message,
          error: infraRes.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            path: '/sandboxes/metrics',
            status,
            start,
            end,
          },
        },
        `Failed to get team metrics: ${infraRes.error.message}`
      )

      return Response.json(
        { error: handleDefaultInfraError(status) },
        { status }
      )
    }

    const metrics = infraRes.data.map((d) => ({
      ...d,
      timestamp: new Date(d.timestamp).getTime(),
    }))

    const step =
      metrics[1]?.timestamp && metrics[0]?.timestamp
        ? metrics[1]?.timestamp - metrics[0]?.timestamp
        : 0

    return Response.json({ metrics, step } satisfies TeamMetricsResponse)
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
