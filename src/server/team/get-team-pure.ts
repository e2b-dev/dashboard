import 'server-cli-only'

import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { returnServerError } from '@/lib/utils/action'
import { ClientTeam } from '@/types/dashboard.types'

export const getTeamPure = async (userId: string, teamId: string) => {
  const { data: userTeamsRelationData, error: userTeamsRelationError } =
    await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)

  if (userTeamsRelationError) {
    throw userTeamsRelationError
  }

  if (!userTeamsRelationData || userTeamsRelationData.length === 0) {
    return returnServerError('User is not authorized to view this team')
  }

  const relation = userTeamsRelationData[0]!

  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single()

  if (teamError) {
    throw teamError
  }

  const ClientTeam: ClientTeam = {
    ...team,
    is_default: relation.is_default,
  }

  return ClientTeam
}
