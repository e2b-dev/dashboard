import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/page'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { parseAndCreateTimeframe } from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { getTeamTierLimits } from '@/server/team/get-team-tier-limits'
import { Suspense } from 'react'
import { TeamMetricsChartsProvider } from '../charts-context'
import ConcurrentChartClient from './concurrent-chart.client'
import ChartFallback from './fallback'
import StartRateChartClient from './start-rate-chart.client'

interface TeamMetricsChartsProps {
  params: Promise<SandboxesMonitoringPageParams>
  searchParams: Promise<SandboxesMonitoringPageSearchParams>
}

export function TeamMetricsCharts({
  params,
  searchParams,
}: TeamMetricsChartsProps) {
  return (
    <Suspense
      fallback={
        <>
          <ChartFallback title="Concurrent" subtitle="Average over range" />
          <ChartFallback
            title="Start Rate per Second"
            subtitle="Median over range"
          />
        </>
      }
    >
      <TeamMetricsChartsResolver params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function TeamMetricsChartsResolver({
  params,
  searchParams,
}: TeamMetricsChartsProps) {
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
    const errorMessage =
      teamMetricsResult?.serverError ||
      teamMetricsResult?.validationErrors?.formErrors[0] ||
      'Failed to load metrics data.'

    return (
      <>
        <ChartFallback
          title="Concurrent"
          subtitle="Average over range"
          error={errorMessage}
        />
        <ChartFallback
          title="Start Rate per Second"
          subtitle="Median over range"
          error={errorMessage}
        />
      </>
    )
  }

  const concurrentInstancesLimit = tierLimitsResult?.data?.concurrentInstances

  return (
    <TeamMetricsChartsProvider
      teamId={teamId}
      initialData={teamMetricsResult.data}
    >
      <ConcurrentChartClient
        concurrentInstancesLimit={concurrentInstancesLimit}
      />
      <StartRateChartClient />
    </TeamMetricsChartsProvider>
  )
}
