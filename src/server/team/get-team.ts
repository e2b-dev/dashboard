import 'server-only'

import { authActionClient } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { returnServerError } from '@/lib/utils/action'
import { ClientTeam } from '@/types/dashboard.types'
import { serializeError } from 'serialize-error'
import { z } from 'zod'

const GetTeamSchema = z.object({
  teamId: z.uuid(),
})

export const getTeam = authActionClient
  .schema(GetTeamSchema)
  .metadata({ serverFunctionName: 'getTeam' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { user } = ctx

    const { data: userTeamsRelationData, error: userTeamsRelationError } =
      await supabaseAdmin
        .from('users_teams')
        .select('*')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single()

    if (userTeamsRelationError) {
      return returnServerError('User is not authorized to view this team')
    }

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
      is_default: userTeamsRelationData?.is_default,
    }

    return ClientTeam
  })

export const getUserTeams = authActionClient
  .metadata({ serverFunctionName: 'getUserTeams' })
  .action(async ({ ctx }) => {
    const { user } = ctx

    const { data: usersTeamsData, error } = await supabaseAdmin
      .from('users_teams')
      .select('*, teams (*)')
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    if (!usersTeamsData || usersTeamsData.length === 0) {
      return returnServerError('No teams found.')
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
        allConnectedDefaultTeamRelations?.map((relation) => relation.user_id) ||
          []
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

        return usersTeamsData.map((userTeam) => ({
          ...userTeam.teams,
          is_default: userTeam.is_default,
        }))
      }

      const userEmailMap = new Map(
        defaultTeamAuthUsers?.map((user) => [user.id, user.email]) || []
      )

      const teams: ClientTeam[] = usersTeamsData.map((userTeam) => {
        const team = userTeam.teams
        const defaultTeamRelation = allConnectedDefaultTeamRelations.find(
          (relation) => relation.team_id === team.id
        )

        let transformedDefaultName
        // generate a transformed default name if the team is a default team and the team name is the same as the default user's email
        if (
          defaultTeamRelation &&
          team.name === userEmailMap.get(defaultTeamRelation.user_id)
        ) {
          const email = team.name
          const splitEmail = email.split('@')

          if (splitEmail.length > 0 && splitEmail[0]) {
            const username =
              splitEmail[0].charAt(0).toUpperCase() + splitEmail[0].slice(1)
            transformedDefaultName = `${username}'s Team`
          }
        }

        return {
          ...team,
          is_default: userTeam.is_default,
          transformed_default_name: transformedDefaultName,
        }
      })

      return teams
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
  })
