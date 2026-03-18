import { createRouteServices } from '@/core/server/context/from-route'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { createClient } from '@/lib/clients/supabase/server'
import type { UserTeamsResponse } from './types'

export async function GET() {
  try {
    const supabase = await createClient()
    const session = await getSessionInsecure(supabase)

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const services = createRouteServices({ accessToken: session.access_token })
    const teamsResult = await services.teams.listUserTeams()

    if (!teamsResult.ok) {
      return Response.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    return Response.json({
      teams: teamsResult.data,
    } satisfies UserTeamsResponse)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('During prerendering')
    ) {
      throw error
    }

    console.error('Error fetching user teams:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
