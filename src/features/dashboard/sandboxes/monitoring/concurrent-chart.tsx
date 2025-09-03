import { Suspense } from 'react'

import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/default'
import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'
import { l } from '@/lib/clients/logger/logger'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { getTeamTierLimits } from '@/server/team/get-team-tier-limits'

import ChartFallback from './chart-fallback'
import ConcurrentChartClient from './concurrent-chart.client'

interface ConcurrentChartProps {
  params: Promise<SandboxesMonitoringPageParams>
  searchParams: Promise<SandboxesMonitoringPageSearchParams>
}

export async function ConcurrentChart({
  params,
  searchParams,
}: ConcurrentChartProps) {
  return (
    <Suspense fallback={<ChartFallback title="Concurrent" subtitle="AVG" />}>
      <ConcurrentChartResolver params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function ConcurrentChartResolver({
  params,
  searchParams,
}: ConcurrentChartProps) {
  const { teamIdOrSlug } = await params
  const { plot } = await searchParams

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  // parse timeframe from zustand store in url
  const defaultNow = Date.now()
  let start = defaultNow - TEAM_METRICS_INITIAL_RANGE_MS
  let end = defaultNow

  if (plot) {
    try {
      const parsed = JSON.parse(plot)
      if (parsed.state?.start && parsed.state?.end) {
        start = parsed.state.start
        end = parsed.state.end
      }
    } catch (e) {
      // use default
    }
  }

  // determine if it's "live" based on how close end is to now
  const duration = end - start
  const threshold = Math.max(duration * 0.02, 60 * 1000) // 2% or 1 minute
  const isLive = defaultNow - end < threshold

  l.debug({
    key: 'concurrent_chart:debug',
    context: {
      teamId,
      timeframe: { start, end, isLive },
    },
  })

  const [teamMetricsResult, tierLimits] = await Promise.all([
    getTeamMetrics({
      teamId,
      startDate: start,
      endDate: end,
    }),
    getTeamTierLimits({ teamId }),
  ])

  const data = teamMetricsResult?.data ?? { metrics: [], step: 0 }

  if (!tierLimits?.data) {
    l.error(
      {
        key: 'concurrent_chart:error',
        team_id: teamId,
        context: {
          timeframe: { start, end, isLive },
          serverError: tierLimits?.serverError,
        },
      },
      'No tier limits found for team:',
      teamId
    )
  }

  const concurrentInstancesLimit = tierLimits?.data?.concurrentInstances

  return (
    <ConcurrentChartClient
      initialData={data}
      concurrentInstancesLimit={concurrentInstancesLimit}
    />
  )
}
