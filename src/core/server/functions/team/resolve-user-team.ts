import 'server-only'

import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/cookies'
import type { ResolvedTeam } from '@/core/domains/teams/models'
import { createTeamsRepository } from '@/core/domains/teams/repository.server'
import { l } from '@/lib/clients/logger/logger'

export async function resolveUserTeam(
  accessToken: string
): Promise<ResolvedTeam | null> {
  const cookieStore = await cookies()

  const cookieTeamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  const cookieTeamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  if (cookieTeamId && cookieTeamSlug) {
    return { id: cookieTeamId, slug: cookieTeamSlug }
  }

  const teamsResult = await createTeamsRepository({
    accessToken,
  }).listUserTeams()

  if (!teamsResult.ok) {
    l.error(
      {
        key: 'resolve_user_team:api_error',
      },
      'Failed to fetch user teams'
    )
    return null
  }

  if (teamsResult.data.length === 0) {
    return null
  }

  const defaultTeam = teamsResult.data.find((t) => t.is_default)
  const team = defaultTeam ?? teamsResult.data[0]

  if (!team) {
    return null
  }

  return {
    id: team.id,
    slug: team.slug,
  }
}
