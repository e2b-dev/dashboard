import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { createTRPCRouter } from '../init'
import { protectedTeamProcedure } from '../procedures'

export const teamsRouter = createTRPCRouter({
  getLimits: protectedTeamProcedure.query(async ({ ctx }) => {
    const { teamId, user } = ctx

    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('team_limits')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError) {
      throw teamError
    }

    if (!teamData) {
      l.error(
        {
          key: 'teams:get_limits:no_team_limits_found',
          team_id: teamId,
          user_id: user.id,
        },
        `no team_limits found for team: ${teamId}`
      )

      return null
    }

    return {
      concurrentInstances: teamData.concurrent_sandboxes || 0,
      diskMb: teamData.disk_mb || 0,
      maxLengthHours: teamData.max_length_hours || 0,
      maxRamMb: teamData.max_ram_mb || 0,
      maxVcpu: teamData.max_vcpu || 0,
    }
  }),
})
