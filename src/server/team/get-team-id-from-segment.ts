import 'server-only'

import { cacheLife } from 'next/dist/server/use-cache/cache-life'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'
import { serializeError } from 'serialize-error'
import z from 'zod'
import { CACHE_TAGS } from '@/configs/cache'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'

export const getTeamIdFromSegment = async (segment: string) => {
  'use cache'
  cacheLife('default')
  cacheTag(CACHE_TAGS.TEAM_ID_FROM_SEGMENT(segment))

  if (!TeamIdOrSlugSchema.safeParse(segment).success) {
    l.warn(
      {
        key: 'get_team_id_from_segment:invalid_segment',
        context: {
          segment,
        },
      },
      'get_team_id_from_segment - invalid segment'
    )

    return null
  }

  if (z.uuid().safeParse(segment).success) {
    // make sure this uuid is a valid teamId and is not it's slug
    const { data } = await supabaseAdmin
      .from('teams')
      .select('id')
      .not('slug', 'eq', segment)
      .eq('id', segment)

    if (data?.length) {
      return data[0]!.id
    }
  }

  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('slug', segment)

  if (error || !data.length) {
    l.warn(
      {
        key: 'get_team_id_from_segment:failed_to_get_team_id',
        error: serializeError(error),
        context: {
          segment,
        },
      },
      'get_team_id_from_segment - failed to get team id'
    )

    return null
  }

  return data[0]!.id
}
