import { Suspense } from 'react'

import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/default'
import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'

import ChartFallback from './chart-fallback'
import StartRateChartClient from './start-rate-chart.client'

interface StartedChartProps {
  params: Promise<SandboxesMonitoringPageParams>
  searchParams: Promise<SandboxesMonitoringPageSearchParams>
}

export async function StartRateChart({
  params,
  searchParams,
}: StartedChartProps) {
  return (
    <Suspense
      fallback={<ChartFallback title="Start Rate" subtitle="PER SECOND" />}
    >
      <StartRateChartResolver params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function StartRateChartResolver({
  params,
  searchParams,
}: StartedChartProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const { plot } = await searchParams

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

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: start,
    endDate: end,
  })

  const data = teamMetricsResult?.data ?? { metrics: [], step: 0 }

  return <StartRateChartClient initialData={data} />
}
