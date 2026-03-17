import 'server-only'

import { z } from 'zod'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { api } from '@/lib/clients/api'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'

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
    const { teamId, session } = ctx

    if (USE_MOCK_DATA) {
      return MOCK_TIER_LIMITS
    }

    const { data, error } = await api.GET('/teams', {
      headers: SUPABASE_AUTH_HEADERS(session.access_token),
    })

    if (error || !data?.teams) {
      return returnServerError('Failed to fetch team limits')
    }

    const team = data.teams.find((t) => t.id === teamId)

    if (!team) {
      return returnServerError('Team not found')
    }

    return {
      concurrentInstances: team.limits.concurrentSandboxes,
      diskMb: team.limits.diskMb,
      maxLengthHours: team.limits.maxLengthHours,
      maxRamMb: team.limits.maxRamMb,
      maxVcpu: team.limits.maxVcpu,
    } satisfies TeamLimits
  })
