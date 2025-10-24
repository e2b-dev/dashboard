import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import {
  ComputeUsageDelta,
  SandboxesUsageDelta,
  UsageData,
} from '@/server/usage/types'
import { UsageResponse } from '@/types/billing'
import { cache } from 'react'
import { z } from 'zod'
import { fillComputeUsageWithZeros, fillSandboxesUsageWithZeros } from './fill-zeros'

const GetUsageAuthActionSchema = z.object({
  teamId: z.uuid(),
})

async function _fetchTeamUsageDataLogic(teamId: string, accessToken: string) {
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
  const computeUsage = response.day_usages.reduce((acc, usage) => {
    acc.push({
      date: new Date(usage.date),
      ram_gb_hours: usage.ram_gib_hours,
      vcpu_hours: usage.cpu_hours,
      total_cost: usage.price_for_ram + usage.price_for_cpu,
    })
    return acc
  }, [] as ComputeUsageDelta[])

  const sandboxesUsage = response.day_usages.reduce((acc, usage) => {
    acc.push({
      date: new Date(usage.date),
      count: usage.sandbox_count,
    })
    return acc
  }, [] as SandboxesUsageDelta[])

  // Determine time range for zero-filling
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  
  // Use the earliest data point as start, or 30 days ago if no data
  let start = thirtyDaysAgo
  if (computeUsage.length > 0) {
    const firstDate = new Date(computeUsage[0]!.date).getTime()
    start = Math.min(firstDate, thirtyDaysAgo)
  }

  // Fill with zeros to ensure continuous time series
  const filledComputeUsage = fillComputeUsageWithZeros(computeUsage, start, now)
  const filledSandboxesUsage = fillSandboxesUsageWithZeros(sandboxesUsage, start, now)

  return {
    compute: filledComputeUsage,
    sandboxes: filledSandboxesUsage,
    credits: response.credits,
  }
}

export const getAndCacheTeamUsageData = cache(_fetchTeamUsageDataLogic)

export const getUsageThroughReactCache = authActionClient
  .schema(GetUsageAuthActionSchema)
  .metadata({ serverFunctionName: 'getUsage' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const accessToken = ctx.session.access_token

    const result = await getAndCacheTeamUsageData(teamId, accessToken)

    if (!result) {
      return returnServerError('Failed to fetch usage data')
    }

    return result
  })
