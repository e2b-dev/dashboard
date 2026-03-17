import 'server-only'

import z from 'zod'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { api } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'

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

  const { data, error } = await api.GET('/teams/resolve', {
    params: { query: { slug: segment } },
    headers: SUPABASE_AUTH_HEADERS(accessToken),
    next: { tags: [CACHE_TAGS.TEAM_ID_FROM_SEGMENT(segment)] },
  })

  if (error || !data) {
    l.warn(
      {
        key: 'get_team_id_from_segment:resolve_failed',
        context: { segment },
      },
      'get_team_id_from_segment - failed to resolve'
    )

    return null
  }

  return data.id
}
