import 'server-cli-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { createClient } from '@/lib/clients/supabase/server'
import { transformMetricsToClientMetrics } from '@/lib/utils/sandboxes'

import { l } from '@/lib/clients/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { MetricsRequestSchema, MetricsResponse } from './types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params

    const { sandboxIds } = MetricsRequestSchema.parse(await request.json())

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return Response.json({ error: 'Unauthenticated' }, { status: 401 })
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
        key: 'get_team_sandboxes_metrics',
        message: infraRes.error.message,
        error: infraRes.error,
        team_id: teamId,
        user_id: session.user.id,
        context: {
          path: '/sandboxes/metrics',
          status,
          sandboxIds,
        },
      })

      return Response.json(
        { error: handleDefaultInfraError(status) },
        { status }
      )
    }

    const metrics = transformMetricsToClientMetrics(infraRes.data.sandboxes)

    return Response.json({ metrics } satisfies MetricsResponse)
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
