import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/page'
import { fillTeamMetricsWithZeros } from '@/features/dashboard/sandboxes/monitoring/utils'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { parseAndCreateTimeframe } from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { Suspense } from 'react'
import ChartFallback from './fallback'
import StartRateChartClient from './start-rate-chart.client'

const TITLE = 'Start Rate per Second'
const SUBTITLE = 'Median over range'

interface StartedChartProps {
  params: Promise<SandboxesMonitoringPageParams>
  searchParams: Promise<SandboxesMonitoringPageSearchParams>
}

export async function StartRateChart({
  params,
  searchParams,
}: StartedChartProps) {
  return (
    <Suspense fallback={<ChartFallback title={TITLE} subtitle={SUBTITLE} />}>
      <StartRateChartResolver params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function StartRateChartResolver({
  params,
  searchParams,
}: StartedChartProps) {
  const { teamIdOrSlug } = await params
  const { plot } = await searchParams

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const timeframe = parseAndCreateTimeframe(plot)

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: timeframe.start,
    endDate: timeframe.end,
  })

  if (
    !teamMetricsResult?.data ||
    teamMetricsResult.serverError ||
    teamMetricsResult.validationErrors
  ) {
    return (
      <ChartFallback
        title={TITLE}
        subtitle={SUBTITLE}
        error={
          teamMetricsResult?.serverError ||
          teamMetricsResult?.validationErrors?.formErrors[0] ||
          'Failed to load start rate data.'
        }
      />
    )
  }

  const metrics = teamMetricsResult.data.metrics
  const step = teamMetricsResult.data.step

  const filledMetrics = fillTeamMetricsWithZeros(
    metrics,
    timeframe.start,
    timeframe.end,
    step
  )

  return (
    <StartRateChartClient
      teamId={teamId}
      initialData={{
        step,
        metrics: filledMetrics,
      }}
    />
  )
}
