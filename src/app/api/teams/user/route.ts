import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { createClient } from '@/core/shared/clients/supabase/server'
import type { UserTeamsResponse } from './types'

export async function GET() {
  try {
    const supabase = await createClient()
    const session = await getSessionInsecure(supabase)

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamsResult = await createUserTeamsRepository({
      accessToken: session.access_token,
    }).listUserTeams()

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
