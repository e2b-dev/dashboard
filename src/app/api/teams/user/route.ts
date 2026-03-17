import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { api } from '@/lib/clients/api'
import { createClient } from '@/lib/clients/supabase/server'
import { getSessionInsecure } from '@/server/auth/get-session'
import type { ClientTeam } from '@/types/dashboard.types'
import type { UserTeamsResponse } from './types'

export async function GET() {
  try {
    const supabase = await createClient()
    const session = await getSessionInsecure(supabase)

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await api.GET('/teams', {
      headers: SUPABASE_AUTH_HEADERS(session.access_token),
    })

    if (error || !data?.teams) {
      return Response.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    const teams: ClientTeam[] = data.teams.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      tier: t.tier,
      email: t.email,
      is_default: t.isDefault,
      is_banned: false,
      is_blocked: false,
      blocked_reason: null,
      cluster_id: null,
      created_at: '',
      profile_picture_url: null,
    }))

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
