import { Suspense } from 'react'
import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'
import { getTeamMetrics } from '@/core/server/functions/sandboxes/get-team-metrics'
import { TeamMetricsChartsProvider } from '../charts-context'
import ConcurrentChartClient from './concurrent-chart'
import ChartFallback from './fallback'
import StartRateChartClient from './startrate-chart'

interface TeamMetricsChartsProps {
  params: Promise<{ teamIdOrSlug: string }>
  searchParams: Promise<{ start?: string; end?: string }>
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

  // parse start/end from URL params with defaults
  const now = Date.now()
  const start = startParam
    ? parseInt(startParam, 10)
    : now - TEAM_METRICS_INITIAL_RANGE_MS
  const end = endParam ? parseInt(endParam, 10) : now

  const teamMetricsResult = await getTeamMetrics({
    teamIdOrSlug,
    startDate: start,
    endDate: end,
  })

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

  return (
    <TeamMetricsChartsProvider initialData={teamMetricsResult.data}>
      <ConcurrentChartClient />
      <StartRateChartClient />
    </TeamMetricsChartsProvider>
  )
}
