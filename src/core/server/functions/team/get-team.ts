import 'server-cli-only'

import { z } from 'zod'
import { createUserTeamsRepository } from '@/core/domains/teams/user-teams-repository.server'
import { toActionErrorFromRepoError } from '@/core/server/adapters/repo-error'
import {
  authActionClient,
  withAuthedRequestRepository,
  withTeamIdResolution,
} from '@/core/server/actions/client'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'

const withTeamsRepository = withAuthedRequestRepository(
  createUserTeamsRepository,
  (teamsRepository) => ({ teamsRepository })
)

const GetTeamSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getTeam = authActionClient
  .schema(GetTeamSchema)
  .metadata({ serverFunctionName: 'getTeam' })
  .use(withTeamIdResolution)
  .use(withTeamsRepository)
  .action(async ({ ctx }) => {
    const teamResult = await ctx.teamsRepository.getCurrentUserTeam(ctx.teamId)

    if (!teamResult.ok) {
      return toActionErrorFromRepoError(teamResult.error)
    }

    return teamResult.data
  })

export const getUserTeams = authActionClient
  .metadata({ serverFunctionName: 'getUserTeams' })
  .use(withTeamsRepository)
  .action(async ({ ctx }) => {
    const teamsResult = await ctx.teamsRepository.listUserTeams()

    if (!teamsResult.ok || teamsResult.data.length === 0) {
      return returnServerError('No teams found.')
    }

    return teamsResult.data
  })
