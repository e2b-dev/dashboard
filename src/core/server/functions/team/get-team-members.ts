import 'server-only'

import { z } from 'zod'
import { toActionErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'

const GetTeamMembersSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getTeamMembers = authActionClient
  .schema(GetTeamMembersSchema)
  .metadata({ serverFunctionName: 'getTeamMembers' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const result = await ctx.services.teams.listTeamMembers()
    if (!result.ok) {
      return toActionErrorFromRepoError(result.error)
    }
    return result.data
  })
