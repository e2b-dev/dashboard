'use client'

import { formatDecimal } from '@/lib/utils/formatting'
import { ReactiveLiveBadge } from '@/ui/live'
import { useMemo } from 'react'
import { useTeamMetricsCharts } from '../charts-context'
import TeamMetricsChart, {
  calculateCentralTendency,
  transformMetrics,
} from './team-metrics-chart'

export default function StartRateChartClient() {
  const { data, isPolling, timeframe, setCustomRange } = useTeamMetricsCharts()

  const chartData = useMemo(() => {
    if (!data?.metrics) return []
    return transformMetrics(data.metrics, 'sandboxStartRate')
  }, [data?.metrics])

  const centralValue = useMemo(
    () => calculateCentralTendency(chartData, 'median'),
    [chartData]
  )

  if (!data) return null

  return (
    <div className="p-3 md:p-6 border-b w-full h-full flex flex-col flex-1 md:min-h-0">
      <div className="flex flex-col gap-2">
        <div className="prose-label-highlight uppercase max-md:text-sm flex justify-between items-center w-full">
          <span>Start Rate per Second</span>
          <ReactiveLiveBadge
            show={isPolling}
          />
        </div>
        <div className="inline-flex items-end gap-2 md:gap-3">
          <span className="prose-value-big max-md:text-2xl">
            {formatDecimal(centralValue, 3)}
          </span>
          <span className="label-tertiary max-md:text-xs">
            <span className="max-md:hidden">median over range</span>
            <span className="md:hidden">med over range</span>
          </span>
        </div>
      </div>

      <TeamMetricsChart
        type="start-rate"
        metrics={data.metrics}
        step={data.step}
        timeframe={timeframe}
        className="mt-3 md:mt-4 flex-1 max-md:min-h-[30dvh]"
        onZoomEnd={(from, end) => setCustomRange(from, end)}
      />
    </div>
  )
}
