import { createClient } from '@/lib/clients/supabase/server'
import getUserTeamsMemo from '@/server/team/get-user-teams-memo'
import { UserTeamsResponse } from './types'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teams = await getUserTeamsMemo(user)

    return Response.json({ teams } satisfies UserTeamsResponse)
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
