import 'server-cli-only'

import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { ClientTeam } from '@/types/dashboard.types'
import { User } from '@supabase/supabase-js'
import { serializeError } from 'serialize-error'

export async function getUserTeams(user: User): Promise<ClientTeam[]> {
  const { data: usersTeamsData, error } = await supabaseAdmin
    .from('users_teams')
    .select('*, teams (*)')
    .eq('user_id', user.id)

  if (error) {
    throw error
  }

  if (!usersTeamsData || usersTeamsData.length === 0) {
    return []
  }

  const teamIds = usersTeamsData.map((userTeam) => userTeam.teams.id)

  try {
    const { data: allConnectedDefaultTeamRelations, error: relationsError } =
      await supabaseAdmin
        .from('users_teams')
        .select('team_id, user_id, is_default')
        .in('team_id', teamIds)
        .eq('is_default', true)

    if (relationsError) {
      throw relationsError
    }

    const defaultUserIds = new Set(
      allConnectedDefaultTeamRelations?.map((r) => r.user_id) ?? []
    )

    const { data: defaultTeamAuthUsers, error: authUsersError } =
      await supabaseAdmin
        .from('auth_users')
        .select('id, email')
        .in('id', Array.from(defaultUserIds))

    if (authUsersError) {
      l.error({
        key: 'get_usr_teams:supabase_error',
        message: authUsersError.message,
        error: serializeError(authUsersError),
        user_id: user.id,
      })
    }

    const userEmailMap = new Map(
      defaultTeamAuthUsers?.map((u) => [u.id, u.email]) ?? []
    )

    return usersTeamsData.map((userTeam) => {
      const team = userTeam.teams
      const defaultTeamRelation = allConnectedDefaultTeamRelations?.find(
        (relation) => relation.team_id === team.id
      )

      let transformedDefaultName: string | undefined

      if (
        defaultTeamRelation &&
        team.name === userEmailMap.get(defaultTeamRelation.user_id)
      ) {
        const [username] = team.name.split('@')
        if (username) {
          transformedDefaultName =
            username.charAt(0).toUpperCase() + username.slice(1) + "'s Team"
        }
      }

      return {
        ...team,
        is_default: userTeam.is_default,
        transformed_default_name: transformedDefaultName,
      }
    })
  } catch (err) {
    l.error({
      key: 'get_user_teams:unexpected_error',
      error: serializeError(err),
      user_id: user.id,
      context: {
        usersTeamsData,
      },
    })

    return usersTeamsData.map((userTeam) => ({
      ...userTeam.teams,
      is_default: userTeam.is_default,
    }))
  }
}
