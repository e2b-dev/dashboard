import { SandboxesMonitoringPageParams } from '@/app/dashboard/[teamIdOrSlug]/sandboxes/monitoring/page'
import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { Suspense } from 'react'
import ChartFallback from './chart-fallback'
import ConcurrentChartClient from './concurrent-chart.client'

interface ConcurrentChartProps {
  params: Promise<SandboxesMonitoringPageParams>
}

export function ConcurrentChart({ params }: ConcurrentChartProps) {
  return (
    <Suspense fallback={<ChartFallback title="Concurrent" subtitle="AVG" />}>
      <ConcurrentChartResolver params={params} />
    </Suspense>
  )
}

async function ConcurrentChartResolver({ params }: ConcurrentChartProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const start = Date.now() - TEAM_METRICS_INITIAL_RANGE_MS
  const end = Date.now()

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: start,
    endDate: end,
  })

  const data = teamMetricsResult?.data ?? []

  return <ConcurrentChartClient initialData={data} />
}
