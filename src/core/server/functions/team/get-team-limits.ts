import 'server-only'

import { cache } from 'react'
import { z } from 'zod'
import { USE_MOCK_DATA } from '@/configs/flags'
import { createTeamsRepository } from '@/core/modules/teams/teams-repository.server'
import {
  authActionClient,
  withTeamIdResolution,
} from '@/core/server/actions/client'
import { toActionErrorFromRepoError } from '@/core/server/adapters/repo-error'
import { TeamIdOrSlugSchema } from '@/core/shared/schemas/team'

export interface TeamLimits {
  concurrentInstances: number
  diskMb: number
  maxLengthHours: number
  maxRamMb: number
  maxVcpu: number
}

const MOCK_TIER_LIMITS: TeamLimits = {
  concurrentInstances: 100_000,
  diskMb: 102400,
  maxLengthHours: 24,
  maxRamMb: 65536,
  maxVcpu: 32,
}

const GetTeamLimitsSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

const getTeamLimitsCached = cache(
  async (accessToken: string, teamId: string) => {
    return createTeamsRepository({
      accessToken,
      teamId,
    }).getTeamLimits()
  }
)

export const getTeamLimits = authActionClient
  .schema(GetTeamLimitsSchema)
  .metadata({ serverFunctionName: 'getTeamLimits' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    if (USE_MOCK_DATA) {
      return MOCK_TIER_LIMITS
    }

    const limitsResult = await getTeamLimitsCached(
      ctx.session.access_token,
      ctx.teamId
    )

    if (!limitsResult.ok) {
      return toActionErrorFromRepoError(limitsResult.error)
    }

    return limitsResult.data
  })
