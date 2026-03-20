import 'server-cli-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { handleDefaultInfraError } from '@/core/server/actions/utils'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { transformMetricsToClientMetrics } from '@/core/server/functions/sandboxes/utils'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { infra } from '@/core/shared/clients/api'
import { l } from '@/core/shared/clients/logger/logger'
import { MetricsRequestSchema, type MetricsResponse } from './types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamSlug: string }> }
) {
  try {
    const { teamSlug } = await params

    const { success, data } = MetricsRequestSchema.safeParse(
      await request.json()
    )

    if (!success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { sandboxIds } = data

    // fine to use here, we only need a token for the infra api request. it will validate the token.
    const session = await getSessionInsecure()

    if (!session) {
      return Response.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const teamId = await getTeamIdFromSlug(teamSlug, session.access_token)

    if (!teamId) {
      l.warn(
        {
          key: 'get_team_sandboxes_metrics:forbidden_team',
          team_slug: teamSlug,
          user_id: session.user.id,
        },
        'Failed to resolve team slug for sandbox metrics'
      )

      return Response.json({ error: 'Forbidden' }, { status: 403 })
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

      l.error(
        {
          key: 'get_team_sandboxes_metrics',
          error: infraRes.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            path: '/sandboxes/metrics',
            status,
          },
        },
        `Failed to get team sandbox metrics: ${infraRes.error.message}`
      )

      return Response.json(
        { error: handleDefaultInfraError(status) },
        { status }
      )
    }

    const metrics = transformMetricsToClientMetrics(infraRes.data.sandboxes)

    return Response.json({ metrics } satisfies MetricsResponse)
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
