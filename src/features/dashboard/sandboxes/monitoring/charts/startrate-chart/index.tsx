'use client'

import { ReactiveLiveBadge } from '@/ui/live'
import { useCallback, useRef } from 'react'
import { useTeamMetricsCharts } from '../../charts-context'
import { AnimatedMetricDisplay } from '../animated-metric-display'
import TeamMetricsChart from '../team-metrics-chart'
import { useStartRateChartData, useStartRateDisplayMetric } from './hooks'

export default function StartRateChartClient() {
  const {
    data,
    isPolling,
    timeframe,
    setCustomRange,
    hoveredValue,
    setHoveredValue,
  } = useTeamMetricsCharts()

  const metricsRef = useRef(data?.metrics)
  metricsRef.current = data?.metrics

  const chartData = useStartRateChartData(data)
  const { displayValue, label, timestamp } = useStartRateDisplayMetric(
    chartData,
    hoveredValue
  )

  const handleHoverEnd = useCallback(() => {
    setHoveredValue(null)
  }, [setHoveredValue])

  if (!data) return null

  return (
    <div className="p-3 md:p-6 w-full h-full flex flex-col flex-1 md:min-h-0">
      <div className="flex flex-col gap-2">
        <div className="prose-label-highlight uppercase max-md:text-sm flex justify-between items-center w-full">
          <span>Start Rate per Second</span>
          <ReactiveLiveBadge show={isPolling} />
        </div>
        <AnimatedMetricDisplay
          value={displayValue}
          label={label}
          timestamp={timestamp}
        />
      </div>

      <TeamMetricsChart
        type="start-rate"
        metrics={data.metrics}
        step={data.step}
        timeframe={timeframe}
        className="mt-3 md:mt-4 flex-1 max-md:min-h-[30dvh]"
        onZoomEnd={(from, end) => setCustomRange(from, end)}
        onHoverEnd={handleHoverEnd}
      />
    </div>
  )
}
