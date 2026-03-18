import 'server-cli-only'

import { z } from 'zod'
import { toActionErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'

const GetTeamSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getTeam = authActionClient
  .schema(GetTeamSchema)
  .metadata({ serverFunctionName: 'getTeam' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const teamResult = await ctx.services.teams.getCurrentUserTeam(ctx.teamId)

    if (!teamResult.ok) {
      return toActionErrorFromRepoError(teamResult.error)
    }

    return teamResult.data
  })

export const getUserTeams = authActionClient
  .metadata({ serverFunctionName: 'getUserTeams' })
  .action(async ({ ctx }) => {
    const teamsResult = await ctx.services.teams.listUserTeams()

    if (!teamsResult.ok || teamsResult.data.length === 0) {
      return returnServerError('No teams found.')
    }

    return teamsResult.data
  })
