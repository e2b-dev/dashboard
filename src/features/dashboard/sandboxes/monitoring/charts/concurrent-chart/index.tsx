'use client'

import { ReactiveLiveBadge } from '@/ui/live'
import { useCallback, useRef } from 'react'
import { useTeamMetricsCharts } from '../../charts-context'
import { AnimatedMetricDisplay } from '../animated-metric-display'
import TeamMetricsChart from '../team-metrics-chart'
import { RangeLabel } from './components/range-label'
import { TimeRangeSelector } from './components/time-range-selector'
import {
  useConcurrentChartData,
  useDisplayMetric,
  useTimeRangeDisplay,
} from './hooks'

interface ConcurrentChartProps {
  concurrentInstancesLimit?: number
}

export default function ConcurrentChartClient({
  concurrentInstancesLimit,
}: ConcurrentChartProps) {
  const {
    data,
    isPolling,
    timeframe,
    setTimeRange,
    setCustomRange,
    hoveredValue,
    setHoveredValue,
  } = useTeamMetricsCharts()

  const metricsRef = useRef(data?.metrics)
  metricsRef.current = data?.metrics

  const chartData = useConcurrentChartData(data)
  const { displayValue, label, timestamp } = useDisplayMetric(
    chartData,
    hoveredValue
  )
  const { currentRange, customRangeLabel, customRangeCopyValue } =
    useTimeRangeDisplay(timeframe)

  const handleTooltipValueChange = useCallback(
    (timestamp: number, value: number) => {
      const concurrentDataPoint = metricsRef.current?.find(
        (m) => m.timestamp === timestamp
      )

      setHoveredValue({
        timestamp,
        concurrentSandboxes: value,
        sandboxStartRate: concurrentDataPoint?.sandboxStartRate,
      })
    },
    [setHoveredValue]
  )

  const handleHoverEnd = useCallback(() => {
    setHoveredValue(null)
  }, [setHoveredValue])

  if (!data) return null

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1 md:min-h-0">
      <div className="flex flex-col gap-2">
        <div className="prose-label-highlight uppercase max-md:text-sm flex justify-between items-center">
          <span>Concurrent sandboxes</span>
          <ReactiveLiveBadge suppressHydrationWarning show={isPolling} />
        </div>

        <div className="flex justify-between max-md:flex-col max-md:gap-2">
          <AnimatedMetricDisplay
            value={displayValue}
            label={label}
            timestamp={timestamp}
          />

          <div className="flex items-end gap-2 max-md:flex-col max-md:items-start">
            {customRangeLabel && customRangeCopyValue && (
              <RangeLabel
                label={customRangeLabel}
                copyValue={customRangeCopyValue}
              />
            )}

            <TimeRangeSelector
              timeframe={timeframe}
              currentRange={currentRange}
              onTimeRangeChange={setTimeRange}
              onCustomRangeChange={setCustomRange}
            />
          </div>
        </div>
      </div>

      <TeamMetricsChart
        type="concurrent"
        metrics={data.metrics}
        step={data.step}
        timeframe={timeframe}
        concurrentLimit={concurrentInstancesLimit}
        onZoomEnd={(from, end) => setCustomRange(from, end)}
        onTooltipValueChange={handleTooltipValueChange}
        onHoverEnd={handleHoverEnd}
        className="mt-3 md:mt-4 flex-1 max-md:min-h-[30dvh]"
      />
    </div>
  )
}
