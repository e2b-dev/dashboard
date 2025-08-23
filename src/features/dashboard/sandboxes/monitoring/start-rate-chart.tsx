import { SandboxesMonitoringPageParams } from '@/app/dashboard/[teamIdOrSlug]/sandboxes/monitoring/page'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'
import { Suspense } from 'react'
import ChartFallback from './chart-fallback'
import StartRateChartClient from './start-rate-chart.client'

interface StartedChartProps {
  params: Promise<SandboxesMonitoringPageParams>
}

export function StartRateChart({ params }: StartedChartProps) {
  return (
    <Suspense fallback={<ChartFallback title='Start Rate' subtitle='PER SECOND' />}>
      <StartRateChartResolver params={params} />
    </Suspense>
  )
}

async function StartRateChartResolver({ params }: StartedChartProps) {
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

  return <StartRateChartClient initialData={data} />
}
