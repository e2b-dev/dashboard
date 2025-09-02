import 'server-only'

import { USE_MOCK_DATA } from '@/configs/flags'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { z } from 'zod'
import getTeamTierLimitsMemo from './get-team-tier-limits-memo'

export interface TeamTierLimits {
  concurrentInstances: number
  diskMb: number
  maxLengthHours: number
  maxRamMb: number
  maxVcpu: number
  tierName: string
}

const MOCK_TIER_LIMITS: TeamTierLimits = {
  concurrentInstances: 100_000,
  diskMb: 102400,
  maxLengthHours: 24,
  maxRamMb: 65536,
  maxVcpu: 32,
  tierName: 'Enterprise',
}

const GetTeamTierLimitsSchema = z.object({
  teamId: z.string().uuid(),
})

export const getTeamTierLimits = authActionClient
  .schema(GetTeamTierLimitsSchema)
  .metadata({ serverFunctionName: 'getTeamTierLimits' })
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx
    const { teamId } = parsedInput

    if (USE_MOCK_DATA) {
      return MOCK_TIER_LIMITS
    }

    const tierLimits = await getTeamTierLimitsMemo(teamId, user.id)

    if (!tierLimits) {
      return returnServerError('Failed to fetch team tier limits')
    }

    return tierLimits
  })
