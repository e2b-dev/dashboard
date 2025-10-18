import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'
import {
  ComputeUsageMonthDelta,
  SandboxesUsageDelta,
  UsageData,
} from '@/server/usage/types'
import { UsageResponse } from '@/types/billing'
import { unstable_cacheLife, unstable_cacheTag } from 'next/cache'
import { z } from 'zod'

const GetUsageAuthActionSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

async function fetchAndTransformTeamUsageData(
  teamId: string,
  accessToken: string
) {
  const response = await fetch(
    `${process.env.BILLING_API_URL}/v2/teams/${teamId}/usage`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
    }
  )

  if (!response.ok) {
    const text = (await response.text()) ?? 'Failed to fetch usage data'
    throw new Error(text)
  }

  const data = (await response.json()) as UsageResponse

  return transformResponseToUsageData(data)
}

const transformResponseToUsageData = (response: UsageResponse): UsageData => {
  // group daily usages by month
  const monthlyUsage = response.day_usages.reduce(
    (acc, usage) => {
      const date = new Date(usage.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!acc[monthKey]) {
        acc[monthKey] = {
          total_cost: 0,
          ram_gb_hours: 0,
          vcpu_hours: 0,
          month: date.getMonth() + 1,
          year: date.getFullYear(),
        }
      }

      acc[monthKey].ram_gb_hours += usage.ram_gib_hours
      acc[monthKey].vcpu_hours += usage.cpu_hours
      acc[monthKey].total_cost += usage.price_for_ram + usage.price_for_cpu

      return acc
    },
    {} as Record<string, ComputeUsageMonthDelta>
  )

  const computeUsage = Object.values(monthlyUsage).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })

  const sandboxesUsage = response.day_usages.reduce((acc, usage) => {
    acc.push({
      date: new Date(usage.date),
      count: usage.sandbox_count,
    })
    return acc
  }, [] as SandboxesUsageDelta[])

  return {
    compute: computeUsage,
    sandboxes: sandboxesUsage,
    credits: response.credits,
  }
}

export const getUsageThroughReactCache = authActionClient
  .schema(GetUsageAuthActionSchema)
  .metadata({ serverFunctionName: 'getUsage' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    'use cache'

    const { teamId } = ctx

    unstable_cacheLife('default')
    unstable_cacheTag(CACHE_TAGS.TEAM_USAGE(teamId))

    const accessToken = ctx.session.access_token

    const result = await fetchAndTransformTeamUsageData(teamId, accessToken)

    if (!result) {
      return returnServerError('Failed to fetch usage data')
    }

    return result
  })
