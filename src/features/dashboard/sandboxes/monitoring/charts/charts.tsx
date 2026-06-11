import { Suspense } from 'react'
import { TeamMetricsChartsProvider } from '../charts-context'
import TeamMetricsChartsContent from './content'
import ChartFallback from './fallback'

interface TeamMetricsChartsProps {
  params: Promise<{ teamSlug: string }>
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
  await Promise.all([params, searchParams])

  return (
    <TeamMetricsChartsProvider>
      <TeamMetricsChartsContent />
    </TeamMetricsChartsProvider>
  )
}
