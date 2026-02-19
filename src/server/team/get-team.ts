import 'server-cli-only'

import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'
import { z } from 'zod'
import getTeamMemo from './get-team-memo'
import getUserTeamsMemo from './get-user-teams-memo'

const GetTeamSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getTeam = authActionClient
  .schema(GetTeamSchema)
  .metadata({ serverFunctionName: 'getTeam' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { teamId, user } = ctx

    const team = await getTeamMemo(user.id, teamId)

    return team
  })

export const getUserTeams = authActionClient
  .metadata({ serverFunctionName: 'getUserTeams' })
  .action(async ({ ctx }) => {
    const { user } = ctx

    const teams = await getUserTeamsMemo(user)

    if (!teams || teams.length === 0) {
      return returnServerError('No teams found.')
    }

    return teams
  })
