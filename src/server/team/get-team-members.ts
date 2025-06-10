import 'server-only'

import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { User } from '@supabase/supabase-js'
import { z } from 'zod'
import { TeamMemberInfo } from './types'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'

const GetTeamMembersSchema = z.object({
  teamId: z.string().uuid(),
})

export const getTeamMembers = authActionClient
  .schema(GetTeamMembersSchema)
  .metadata({ serverFunctionName: 'getTeamMembers' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { user } = ctx

    const { data, error } = await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('team_id', teamId)

    if (error) {
      throw error
    }

    const accessGranted =
      data.findIndex((userTeam) => userTeam.user_id === user.id) !== -1

    if (!accessGranted) {
      return returnServerError('User is not authorized to get team members')
    }

    if (!data) {
      return []
    }

    const userResponses = await Promise.all(
      data.map(
        async (userTeam) =>
          (await supabaseAdmin.auth.admin.getUserById(userTeam.user_id)).data
            .user
      )
    )

    return userResponses
      .filter((user) => user !== null)
      .map((user) => ({
        info: memberDTO(user),
        relation: data.find((userTeam) => userTeam.user_id === user.id)!,
      }))
  })

function memberDTO(user: User): TeamMemberInfo {
  return {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.name,
    avatar_url: user.user_metadata?.avatar_url,
  }
}
