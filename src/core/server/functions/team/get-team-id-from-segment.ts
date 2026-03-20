import 'server-only'

import z from 'zod'
import { CACHE_TAGS } from '@/configs/cache'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { l } from '@/core/shared/clients/logger/logger'
import { TeamIdOrSlugSchema } from '@/core/shared/schemas/team'

export const getTeamIdFromSegment = async (
  segment: string,
  accessToken: string
) => {
  if (!TeamIdOrSlugSchema.safeParse(segment).success) {
    l.warn(
      {
        key: 'get_team_id_from_segment:invalid_segment',
        context: { segment },
      },
      'get_team_id_from_segment - invalid segment'
    )

    return null
  }

  if (z.uuid().safeParse(segment).success) {
    return segment
  }

  const resolvedTeam = await createUserTeamsRepository({
    accessToken,
  }).resolveTeamBySlug(segment, {
    tags: [CACHE_TAGS.TEAM_ID_FROM_SEGMENT(segment)],
  })

  if (!resolvedTeam.ok) {
    l.warn(
      {
        key: 'get_team_id_from_segment:resolve_failed',
        context: { segment },
      },
      'get_team_id_from_segment - failed to resolve'
    )

    return null
  }

  return resolvedTeam.data.id
}
