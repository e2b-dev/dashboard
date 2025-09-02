import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/default'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import {
  parseTimeframeFromSearchParams,
  resolveTimeframe,
} from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { Suspense } from 'react'
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

  const resolvedSearchParams = await searchParams

  const timeframeState = parseTimeframeFromSearchParams({
    charts_start: resolvedSearchParams.charts_start,
    charts_end: resolvedSearchParams.charts_end,
  })

  const { start, end } = resolveTimeframe(timeframeState)

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: start,
    endDate: end,
  })

  const data = teamMetricsResult?.data ?? { metrics: [], step: 0 }

  return <StartRateChartClient initialData={data} />
}
