import 'server-cli-only'

import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { serializeError } from 'serialize-error'

export async function getDefaultTeamRelation(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users_teams')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)

  if (error || data.length === 0) {
    l.error({
      key: 'get_default_team_relation:error',
      error: serializeError(error),
      user_id: userId,
    })

    throw new Error('No default team found')
  }

  return data[0]!
}

export async function getDefaultTeam(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users_teams')
    .select(
      `
      team_id,
      teams (
        id,
        name,
        slug
      )
    `
    )
    .eq('user_id', userId)
    .eq('is_default', true)
    .single()

  if (error || !data) {
    l.error({
      key: 'GET_DEFAULT_TEAM:ERROR',
      message: error?.message,
      error: serializeError(error),
      user_id: userId,
    })
    throw new Error('No default team found')
  }

  return data.teams
}
