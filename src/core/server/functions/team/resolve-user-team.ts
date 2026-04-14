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
  const teamsRepository = createUserTeamsRepository({
    accessToken,
  })

  const cookieTeamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  const cookieTeamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  if (cookieTeamSlug) {
    const resolvedCookieTeam =
      await teamsRepository.resolveTeamBySlug(cookieTeamSlug)

    if (resolvedCookieTeam.ok) {
      if (cookieTeamId && cookieTeamId !== resolvedCookieTeam.data.id) {
        l.warn(
          {
            key: 'resolve_user_team:cookie_team_id_mismatch',
            team_id: cookieTeamId,
            context: {
              resolved_team_id: resolvedCookieTeam.data.id,
              team_slug: cookieTeamSlug,
            },
          },
          'Selected team cookie id did not match the resolved team'
        )
      }

      return resolvedCookieTeam.data
    }

    l.warn(
      {
        key: 'resolve_user_team:stale_cookie_team',
        team_id: cookieTeamId,
        context: {
          team_slug: cookieTeamSlug,
        },
      },
      'Selected team cookie could not be resolved for the current user'
    )
  }

  const teamsResult = await teamsRepository.listUserTeams()

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

  return {
    id: team.id,
    slug: team.slug,
  }
}
