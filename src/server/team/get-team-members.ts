import 'server-only'

import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { User } from '@supabase/supabase-js'
import { z } from 'zod'
import { TeamMemberInfo } from './types'

const GetTeamMembersSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getTeamMembers = authActionClient
  .schema(GetTeamMembersSchema)
  .metadata({ serverFunctionName: 'getTeamMembers' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { teamId } = ctx

    const { data, error } = await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('team_id', teamId)

    if (error) {
      throw error
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
