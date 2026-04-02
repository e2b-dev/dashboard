import 'server-only'

import { z } from 'zod'
import { createTeamsRepository } from '@/core/modules/teams/teams-repository.server'
import {
  authActionClient,
  withTeamAuthedRequestRepository,
  withTeamSlugResolution,
} from '@/core/server/actions/client'
import { toActionErrorFromRepoError } from '@/core/server/adapters/errors'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

const withTeamsRepository = withTeamAuthedRequestRepository(
  createTeamsRepository,
  (teamsRepository) => ({ teamsRepository })
)

const GetTeamMembersSchema = z.object({
  teamSlug: TeamSlugSchema,
})

export const getTeamMembers = authActionClient
  .schema(GetTeamMembersSchema)
  .metadata({ serverFunctionName: 'getTeamMembers' })
  .use(withTeamSlugResolution)
  .use(withTeamsRepository)
  .action(async ({ ctx }) => {
    const result = await ctx.teamsRepository.listTeamMembers()
    if (!result.ok) {
      return toActionErrorFromRepoError(result.error)
    }
    return result.data
  })
