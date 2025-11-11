import 'server-only'

import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { serializeError } from 'serialize-error'

/*
 *  This function checks if a user is authorized to access a team.
 *  If the user is not authorized, it returns false.
 */
export default async function checkUserTeamAuthorizationPure(
  userId: string,
  teamId: string
) {
  const { data: userTeamsRelationData, error: userTeamsRelationError } =
    await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)

  if (userTeamsRelationError) {
    l.error(
      {
        key: 'check_user_team_authorization:failed_to_fetch_users_teams_relation',
        error: serializeError(userTeamsRelationError),
        context: {
          userId,
          teamId,
        },
      },
      `Failed to fetch users_teams relation (user: ${userId}, team: ${teamId})`
    )

    return null
  }

  return !!userTeamsRelationData.length
}
