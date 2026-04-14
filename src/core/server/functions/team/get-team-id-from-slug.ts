import 'server-only'

import { CACHE_TAGS } from '@/configs/cache'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { l } from '@/core/shared/clients/logger/logger'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

export const getTeamIdFromSlug = async (
  teamSlug: string,
  accessToken: string
) => {
  if (!TeamSlugSchema.safeParse(teamSlug).success) {
    l.warn(
      {
        key: 'get_team_id_from_slug:invalid_team_slug',
        context: { teamSlug },
      },
      'get_team_id_from_slug - invalid team slug'
    )

    return null
  }

  const resolvedTeam = await createUserTeamsRepository({
    accessToken,
  }).resolveTeamBySlug(teamSlug, {
    tags: [CACHE_TAGS.TEAM_ID_FROM_SLUG(teamSlug)],
  })

  if (!resolvedTeam.ok) {
    l.warn(
      {
        key: 'get_team_id_from_slug:resolve_failed',
        context: { teamSlug },
      },
      'get_team_id_from_slug - failed to resolve'
    )

    return null
  }

  return resolvedTeam.data.id
}
