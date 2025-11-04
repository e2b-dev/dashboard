import 'server-only'

import { USE_MOCK_DATA } from '@/configs/flags'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { z } from 'zod'
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

const GetTeamTierLimitsSchema = z.object({
  teamId: z.uuid(),
})

export const getTeamLimits = authActionClient
  .schema(GetTeamTierLimitsSchema)
  .metadata({ serverFunctionName: 'getTeamLimits' })
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx
    const { teamId } = parsedInput

    if (USE_MOCK_DATA) {
      return MOCK_TIER_LIMITS
    }

    const tierLimits = await getTeamLimitsMemo(teamId, user.id)

    if (!tierLimits) {
      return returnServerError('Failed to fetch team limits')
    }

    return tierLimits
  })
