import 'server-cli-only'

import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'

export async function getDefaultTeamRelation(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users_teams')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)

  if (error || data.length === 0) {
    logError(ERROR_CODES.SUPABASE, 'Failed to get default team', {
      userId,
      error: error?.message,
      data: data,
    })
    throw new Error('No default team found')
  }

  return data[0]
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
    throw new Error('No default team found')
  }

  return data.teams
}
