import 'server-only'

import { cookies } from 'next/headers'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { COOKIE_KEYS } from '@/configs/cookies'
import { api } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import type { ResolvedTeam } from './types'

export async function resolveUserTeam(
  accessToken: string
): Promise<ResolvedTeam | null> {
  const cookieStore = await cookies()

  const cookieTeamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  const cookieTeamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  if (cookieTeamId && cookieTeamSlug) {
    return { id: cookieTeamId, slug: cookieTeamSlug }
  }

  const { data, error } = await api.GET('/teams', {
    headers: SUPABASE_AUTH_HEADERS(accessToken),
  })

  if (error || !data?.teams) {
    l.error(
      {
        key: 'resolve_user_team:api_error',
      },
      'Failed to fetch user teams'
    )
    return null
  }

  if (data.teams.length === 0) {
    return null
  }

  const defaultTeam = data.teams.find((t) => t.isDefault)
  const team = defaultTeam ?? data.teams[0]

  if (!team) {
    return null
  }

  return {
    id: team.id,
    slug: team.slug,
  }
}
