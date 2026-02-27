import 'server-cli-only'

import { cache } from 'react'
import { serializeError } from 'serialize-error'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import type { TeamLimits } from './get-team-limits'

/**
 * Internal function to fetch team limits from the database
 */
async function _getTeamLimits(
  teamId: string,
  userId: string
): Promise<TeamLimits | null> {
  try {
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('team_limits')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError) {
      l.error({
        key: 'get_team_limits_memo:team_query_error',
        message: teamError.message,
        error: serializeError(teamError),
        team_id: teamId,
        user_id: userId,
      })
      return null
    }

    if (!teamData) {
      l.error({
        key: 'get_team_limits_memo:no_team_data',
        message: 'No data found for team',
        team_id: teamId,
        user_id: userId,
      })
      return null
    }

    return {
      concurrentInstances: teamData.concurrent_sandboxes || 0,
      diskMb: teamData.disk_mb || 0,
      maxLengthHours: teamData.max_length_hours || 0,
      maxRamMb: teamData.max_ram_mb || 0,
      maxVcpu: teamData.max_vcpu || 0,
    }
  } catch (error) {
    l.error({
      key: 'get_team_limits_memo:unexpected_error',
      message: 'Unexpected error fetching team limits',
      error: serializeError(error),
      team_id: teamId,
      user_id: userId,
    })
    return null
  }
}

const getTeamLimitsMemo = cache(_getTeamLimits)

export default getTeamLimitsMemo
