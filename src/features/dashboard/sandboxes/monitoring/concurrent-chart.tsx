import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/default'
import { l } from '@/lib/clients/logger/logger'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import {
  parseTimeframeFromSearchParams,
  resolveTimeframe,
} from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { Suspense } from 'react'
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
  const { charts_start, charts_end } = await searchParams

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const timeframeState = parseTimeframeFromSearchParams({
    charts_start,
    charts_end,
  })

  const { start, end, isLive } = resolveTimeframe(timeframeState)

  l.debug({
    key: 'concurrent_chart:debug',
    context: {
      teamId,
      timeframe: { start, end, isLive },
    },
  })

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: start,
    endDate: end,
  })

  const data = teamMetricsResult?.data ?? []

  return <ConcurrentChartClient initialData={data} />
}
