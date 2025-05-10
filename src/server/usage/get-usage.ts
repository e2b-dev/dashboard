import 'server-only'
import { cache } from 'react'
import { Usage, TransformedUsageData } from '@/server/usage/types'
import { z } from 'zod'
import { actionClient, authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/constants'

const GetUsageAuthActionSchema = z.object({
  teamId: z.string().uuid(),
})

async function _fetchTeamUsageDataLogic(
  teamId: string,
  accessToken: string
): Promise<(TransformedUsageData & { credits: number }) | null> {
  const response = await fetch(
    `${process.env.BILLING_API_URL}/teams/${teamId}/usage`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
    }
  )

  if (!response.ok) {
    const text = (await response.text()) ?? 'Unknown error'
    throw new Error(text)
  }

  const data = await response.json()

  return {
    ...transformUsageData(data.usages),
    credits: data.credits as number,
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

function transformUsageData(usages: Usage[]): TransformedUsageData {
  const ramData = usages.map((usage) => ({
    x: `${String(usage.month).padStart(2, '0')}/${usage.year}`,
    y: usage.template_usage.reduce(
      (acc, template) => acc + template.ram_gb_hours,
      0
    ),
  }))

  const vcpuData = usages.map((usage) => ({
    x: `${String(usage.month).padStart(2, '0')}/${usage.year}`,
    y: usage.template_usage.reduce(
      (acc, template) => acc + template.sandbox_hours,
      0
    ),
  }))

  const costData = usages.map((usage) => ({
    x: `${String(usage.month).padStart(2, '0')}/${usage.year}`,
    y: usage.template_usage.reduce(
      (acc, template) => acc + template.total_cost,
      0
    ),
  }))

  return {
    vcpuSeries: [
      {
        id: 'vCPU Hours',
        data: vcpuData,
      },
    ],
    ramSeries: [
      {
        id: 'RAM Usage',
        data: ramData,
      },
    ],
    costSeries: [
      {
        id: 'Cost',
        data: costData,
      },
    ],
  }
}
