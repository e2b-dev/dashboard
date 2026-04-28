import 'server-only'

import { CACHE_TAGS } from '@/configs/cache'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { l } from '@/core/shared/clients/logger/logger'
import { err, ok, type RepoResult } from '@/core/shared/result'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

export const getTeamIdFromSlug = async (
  teamSlug: string,
  accessToken: string
): Promise<RepoResult<string | null>> => {
  if (!TeamSlugSchema.safeParse(teamSlug).success) {
    l.warn(
      {
        key: 'get_team_id_from_slug:invalid_team_slug',
        context: { teamSlug },
      },
      'get_team_id_from_slug - invalid team slug'
    )

    return ok(null)
  }

  const resolvedTeam = await createUserTeamsRepository({
    accessToken,
  }).resolveTeamBySlug(teamSlug, {
    tags: [CACHE_TAGS.TEAM_ID_FROM_SLUG(teamSlug)],
  })

  if (!resolvedTeam.ok) {
    if (
      resolvedTeam.error.code === 'forbidden' ||
      resolvedTeam.error.code === 'not_found'
    ) {
      l.warn(
        {
          key: 'get_team_id_from_slug:team_not_accessible',
          context: { teamSlug },
        },
        'get_team_id_from_slug - team slug is not accessible for the current user'
      )

      return ok(null)
    }

    l.warn(
      {
        key: 'get_team_id_from_slug:resolve_failed',
        error: resolvedTeam.error,
        context: { teamSlug },
      },
      'get_team_id_from_slug - failed to resolve'
    )

    return err(resolvedTeam.error)
  }

  return ok(resolvedTeam.data.id)
}
