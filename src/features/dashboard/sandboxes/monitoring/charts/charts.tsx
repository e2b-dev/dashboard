import {
  SandboxesMonitoringPageParams,
  SandboxesMonitoringPageSearchParams,
} from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/page'
import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { getTeamLimits } from '@/server/team/get-team-limits'
import { Suspense } from 'react'
import { TeamMetricsChartsProvider } from '../charts-context'
import ConcurrentChartClient from './concurrent-chart'
import ChartFallback from './fallback'
import StartRateChartClient from './startrate-chart'

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
  const { start: startParam, end: endParam } = await searchParams

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  // parse start/end from URL params with defaults
  const now = Date.now()
  const start = startParam
    ? parseInt(startParam, 10)
    : now - TEAM_METRICS_INITIAL_RANGE_MS
  const end = endParam ? parseInt(endParam, 10) : now

  const [teamMetricsResult, tierLimitsResult] = await Promise.all([
    getTeamMetrics({
      teamId,
      startDate: start,
      endDate: end,
    }),
    getTeamLimits({ teamId }),
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
