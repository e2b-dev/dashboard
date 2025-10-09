import 'server-only'

import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { cache } from 'react'
import { serializeError } from 'serialize-error'
import type { TeamTierLimits } from './get-team-tier-limits'

/**
 * Internal function to fetch team tier limits from the database
 */
async function _getTeamTierLimits(
  teamId: string,
  userId: string
): Promise<TeamTierLimits | null> {
  try {
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .select(
        `
        id,
        tier,
        tiers (
          name,
          concurrent_instances,
          disk_mb,
          max_length_hours,
          max_ram_mb,
          max_vcpu
        )
      `
      )
      .eq('id', teamId)
      .single()

    if (teamError) {
      l.error({
        key: 'get_team_tier_limits_memo:team_query_error',
        message: teamError.message,
        error: serializeError(teamError),
        team_id: teamId,
        user_id: userId,
      })
      return null
    }

    if (!teamData?.tiers) {
      l.error({
        key: 'get_team_tier_limits_memo:no_tier_data',
        message: 'No tier data found for team',
        team_id: teamId,
        user_id: userId,
      })
      return null
    }

    const tierData = teamData.tiers

    return {
      concurrentInstances: tierData.concurrent_instances,
      diskMb: tierData.disk_mb,
      maxLengthHours: tierData.max_length_hours,
      maxRamMb: tierData.max_ram_mb,
      maxVcpu: tierData.max_vcpu,
      tierName: tierData.name,
    }
  } catch (error) {
    l.error({
      key: 'get_team_tier_limits_memo:unexpected_error',
      message: 'Unexpected error fetching team tier limits',
      error: serializeError(error),
      team_id: teamId,
      user_id: userId,
    })
    return null
  }
}

const getTeamTierLimitsMemo = cache(_getTeamTierLimits)

export default getTeamTierLimitsMemo
