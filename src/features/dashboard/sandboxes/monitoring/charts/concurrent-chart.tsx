import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/page'
import { fillTeamMetricsWithZeros } from '@/features/dashboard/sandboxes/monitoring/utils'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { parseAndCreateTimeframe } from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { getTeamTierLimits } from '@/server/team/get-team-tier-limits'
import { Suspense } from 'react'
import ConcurrentChartClient from './concurrent-chart.client'
import ChartFallback from './fallback'

const TITLE = 'Concurrent'
const SUBTITLE = 'Average over range'

interface ConcurrentChartProps {
  params: Promise<SandboxesMonitoringPageParams>
  searchParams: Promise<SandboxesMonitoringPageSearchParams>
}

export async function ConcurrentChart({
  params,
  searchParams,
}: ConcurrentChartProps) {
  return (
    <Suspense fallback={<ChartFallback title={TITLE} subtitle={SUBTITLE} />}>
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

  const timeframe = parseAndCreateTimeframe(plot)

  const [teamMetricsResult, tierLimitsResult] = await Promise.all([
    getTeamMetrics({
      teamId,
      startDate: timeframe.start,
      endDate: timeframe.end,
    }),
    getTeamTierLimits({ teamId }),
  ])

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
          'Failed to load concurrent data.'
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

  const concurrentInstancesLimit = tierLimitsResult?.data?.concurrentInstances

  return (
    <ConcurrentChartClient
      teamId={teamId}
      initialData={{
        step,
        metrics: filledMetrics,
      }}
      concurrentInstancesLimit={concurrentInstancesLimit}
    />
  )
}
