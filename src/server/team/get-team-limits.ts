import 'server-only'

import { z } from 'zod'
import { USE_MOCK_DATA } from '@/configs/flags'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'
import getTeamLimitsMemo from './get-team-limits-memo'

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

export const getTeamLimits = authActionClient
  .schema(GetTeamLimitsSchema)
  .metadata({ serverFunctionName: 'getTeamLimits' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { user, teamId } = ctx

    if (USE_MOCK_DATA) {
      return MOCK_TIER_LIMITS
    }

    const tierLimits = await getTeamLimitsMemo(teamId, user.id)

    if (!tierLimits) {
      return returnServerError('Failed to fetch team limits')
    }

    return tierLimits
  })
