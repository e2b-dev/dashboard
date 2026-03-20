import 'server-only'

import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/cookies'
import type { ResolvedTeam } from '@/core/modules/teams/models'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { l } from '@/core/shared/clients/logger/logger'

export async function resolveUserTeam(
  accessToken: string
): Promise<ResolvedTeam | null> {
  const cookieStore = await cookies()

  const cookieTeamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  const cookieTeamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  if (cookieTeamId && cookieTeamSlug) {
    return { id: cookieTeamId, slug: cookieTeamSlug }
  }

  const teamsResult = await createUserTeamsRepository({
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

  const defaultTeam = teamsResult.data.find(
    (team) => team.isDefault && team.slug
  )
  const team =
    defaultTeam ?? teamsResult.data.find((candidate) => candidate.slug)

  if (!team) {
    return null
  }

  if (!team.slug) {
    l.warn(
      {
        key: 'resolve_user_team:missing_team_slug',
        team_id: team.id,
      },
      'Failed to resolve a slug-backed team'
    )
    return null
  }

  return {
    id: team.id,
    slug: team.slug,
  }
}
