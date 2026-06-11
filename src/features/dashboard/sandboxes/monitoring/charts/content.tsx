'use client'

import { useMemo } from 'react'
import { useTeamMetricsCharts } from '../charts-context'
import ConcurrentChartClient from './concurrent-chart'
import ChartFallback from './fallback'
import StartRateChartClient from './startrate-chart'

function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined
  if (error instanceof Error) return error.message
  return 'Failed to load metrics data.'
}

function MetricsChartFallbacks({ error }: { error?: string }) {
  return (
    <>
      <ChartFallback
        title="Concurrent"
        subtitle="Average over range"
        error={error}
      />
      <ChartFallback
        title="Start Rate per Second"
        subtitle="Median over range"
        error={error}
      />
    </>
  )
}

export default function TeamMetricsChartsContent() {
  const { data, error, isLoading } = useTeamMetricsCharts()
  const errorMessage = useMemo(() => getErrorMessage(error), [error])

  if (!data) {
    return (
      <MetricsChartFallbacks error={isLoading ? undefined : errorMessage} />
    )
  }

  return (
    <>
      <ConcurrentChartClient />
      <StartRateChartClient />
    </>
  )
}
