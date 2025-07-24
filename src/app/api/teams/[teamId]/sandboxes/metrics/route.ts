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

      l.error('GET_TEAM_SANDBOXES_METRICS:INFRA_ERROR', infraRes.error, {
        path: '/sandboxes/metrics',
        status,
        sandboxIds,
        userId: session.user.id,
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
