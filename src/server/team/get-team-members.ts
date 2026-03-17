import 'server-only'

import { z } from 'zod'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { api } from '@/lib/clients/api'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import type { TeamMemberInfo } from './types'

const GetTeamMembersSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getTeamMembers = authActionClient
  .schema(GetTeamMembersSchema)
  .metadata({ serverFunctionName: 'getTeamMembers' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { teamId, session } = ctx

    const { data, error } = await api.GET('/teams/{teamId}/members', {
      params: { path: { teamId } },
      headers: SUPABASE_AUTH_HEADERS(session.access_token, teamId),
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data?.members || data.members.length === 0) {
      return []
    }

    const enrichedMembers = await Promise.all(
      data.members.map(async (member) => {
        const { data: userData } =
          await supabaseAdmin.auth.admin.getUserById(member.id)

        const user = userData.user
        const info: TeamMemberInfo = {
          id: member.id,
          email: member.email,
          name: user?.user_metadata?.name,
          avatar_url: user?.user_metadata?.avatar_url,
        }

        return {
          info,
          relation: {
            added_by: member.addedBy ?? null,
            is_default: member.isDefault,
          },
        }
      })
    )

    return enrichedMembers
  })
