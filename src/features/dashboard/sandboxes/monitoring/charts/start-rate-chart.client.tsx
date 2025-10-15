'use client'

import { formatCompactDate, formatDecimal } from '@/lib/utils/formatting'
import { ReactiveLiveBadge } from '@/ui/live'
import { useCallback, useMemo, useRef } from 'react'
import { useTeamMetricsCharts } from '../charts-context'
import { AnimatedMetricDisplay } from './animated-metric-display'
import TeamMetricsChart, { transformMetrics } from './team-metrics-chart'
import { calculateAverage } from './team-metrics-chart/utils'

export default function StartRateChartClient() {
  const {
    data,
    isPolling,
    timeframe,
    setCustomRange,
    hoveredValue,
    setHoveredValue,
  } = useTeamMetricsCharts()

  // ref to avoid recreating handlers when data changes
  const metricsRef = useRef(data?.metrics)
  metricsRef.current = data?.metrics

  const chartData = useMemo(() => {
    if (!data?.metrics) return []
    return transformMetrics(data.metrics, 'sandboxStartRate')
  }, [data?.metrics])

  const centralValue = useMemo(() => calculateAverage(chartData), [chartData])

  // determine display value, label, and subtitle
  const { displayValue, label, timestamp } = useMemo(() => {
    if (hoveredValue?.sandboxStartRate !== undefined) {
      const formattedDate = formatCompactDate(hoveredValue.timestamp)
      return {
        displayValue: formatDecimal(hoveredValue.sandboxStartRate, 3),
        label: 'at',
        timestamp: formattedDate,
      }
    }
    return {
      displayValue: formatDecimal(centralValue, 3),
      label: 'average',
      timestamp: null,
    }
  }, [hoveredValue, centralValue])

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
        // NOTE: no onTooltipValueChange handler since it's handled in concurrent chart
        onHoverEnd={handleHoverEnd}
      />
    </div>
  )
}
