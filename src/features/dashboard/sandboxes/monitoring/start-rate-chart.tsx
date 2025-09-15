import { Suspense } from 'react'

import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/page'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { parseAndCreateTimeframe } from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'

import { fillTeamMetricsWithZeros } from '@/lib/utils/sandboxes'
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

  const timeframe = parseAndCreateTimeframe(plot)

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: timeframe.start,
    endDate: timeframe.end,
  })

  const filledMetrics = fillTeamMetricsWithZeros(
    teamMetricsResult?.data?.metrics ?? [],
    timeframe.start,
    timeframe.end,
    60_000
  )
  const initialData = {
    step: teamMetricsResult?.data?.step ?? 0,
    metrics: filledMetrics,
  }

  return (
    <StartRateChartClient
      teamId={teamId}
      initialData={initialData}
      initialTimeframe={timeframe}
    />
  )
}
