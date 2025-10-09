'use client'

import { calculateStepForDuration } from '@/features/dashboard/sandboxes/monitoring/utils'
import { cn } from '@/lib/utils'
import { formatAxisNumber, formatCompactDate } from '@/lib/utils/formatting'
import {
  TIME_RANGES,
  TimeRangeKey,
  formatTimeframeAsISO8601Interval,
} from '@/lib/utils/timeframe'
import CopyButton from '@/ui/copy-button'
import { ReactiveLiveBadge } from '@/ui/live'
import { Button } from '@/ui/primitives/button'
import { useMemo } from 'react'
import { useTeamMetricsCharts } from '../charts-context'
import { TimePicker } from '../time-picker'
import TeamMetricsChart, {
  calculateCentralTendency,
  transformMetrics,
} from './team-metrics-chart'

const CHART_RANGE_MAP = {
  custom: null,
  ...TIME_RANGES,
} as const

const CHART_RANGE_MAP_KEYS = Object.keys(CHART_RANGE_MAP) as Array<
  keyof typeof CHART_RANGE_MAP
>

interface ConcurrentChartProps {
  concurrentInstancesLimit?: number
}

export default function ConcurrentChartClient({
  concurrentInstancesLimit,
}: ConcurrentChartProps) {
  const { data, isPolling, timeframe, setTimeRange, setCustomRange } =
    useTeamMetricsCharts()

  const chartData = useMemo(() => {
    if (!data?.metrics) return []
    return transformMetrics(data.metrics, 'concurrentSandboxes')
  }, [data?.metrics])

  const centralValue = useMemo(
    () => calculateCentralTendency(chartData, 'average'),
    [chartData]
  )

  const currentRange = useMemo(() => {
    const currentDuration = timeframe.duration

    // calculate tolerance to account for rounding errors
    const step = calculateStepForDuration(currentDuration)
    const tolerance = step * 1.5

    const matchingRange = Object.entries(TIME_RANGES).find(
      ([_, rangeMs]) => Math.abs(rangeMs - currentDuration) < tolerance
    )

    return matchingRange ? matchingRange[0] : 'custom'
  }, [timeframe.duration])

  const customRangeLabel = useMemo(() => {
    if (!timeframe.isLive || currentRange === 'custom') {
      return `${formatCompactDate(timeframe.start)} - ${formatCompactDate(timeframe.end)}`
    }
    return null
  }, [currentRange, timeframe.start, timeframe.end, timeframe.isLive])

  const customRangeCopyValue = useMemo(() => {
    if (!timeframe.isLive || currentRange === 'custom') {
      return formatTimeframeAsISO8601Interval(timeframe.start, timeframe.end)
    }
    return null
  }, [currentRange, timeframe.start, timeframe.end, timeframe.isLive])

  const handleRangeChange = (range: keyof typeof CHART_RANGE_MAP) => {
    if (range === 'custom') return
    setTimeRange(range as TimeRangeKey)
  }

  if (!data) return null

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1 md:min-h-0">
      <div className="flex flex-col gap-2">
        <div className="prose-label-highlight uppercase max-md:text-sm flex justify-between items-center">
          <span>Concurrent sandboxes</span>
          <ReactiveLiveBadge show={isPolling} />
        </div>
        <div className="flex justify-between max-md:flex-col max-md:gap-2">
          <div className="inline-flex items-end gap-2">
            <span className="prose-value-big max-md:text-2xl">
              {formatAxisNumber(centralValue)}
            </span>
            <span className="label-tertiary max-md:text-xs">
              <span className="max-md:hidden">average over range</span>
              <span className="md:hidden">avg over range</span>
            </span>
          </div>
          <div className="flex items-end gap-2 max-md:flex-col max-md:items-start">
            {/* Date range label - full width on mobile */}
            {customRangeLabel && customRangeCopyValue && (
              <div className="flex items-center gap-2 max-md:w-full max-md:min-w-0">
                <CopyButton
                  value={customRangeCopyValue}
                  variant="ghost"
                  size="slate"
                  className="size-4 max-md:hidden"
                  title="Copy ISO 8601 time interval"
                />
                <span
                  className="text-fg py-0.5 max-md:text-[11px] md:text-xs prose-label-highlight truncate min-w-0"
                  style={{ letterSpacing: '0%' }}
                  title={customRangeCopyValue}
                >
                  {customRangeLabel}
                </span>
                <CopyButton
                  value={customRangeCopyValue}
                  variant="ghost"
                  size="slate"
                  className="size-4 md:hidden flex-shrink-0"
                  title="Copy ISO 8601 time interval"
                />
              </div>
            )}

            {/* Time selector buttons - single row on mobile */}
            <div className="flex items-center gap-2 md:gap-4 max-md:-ml-1.5 max-md:pr-3 max-md:-mr-3 max-md:-mt-0.5 max-md:overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <TimePicker
                value={{
                  mode: timeframe.isLive ? 'live' : 'static',
                  range: timeframe.duration,
                  start: timeframe.start,
                  end: timeframe.end,
                }}
                onValueChange={(value) => {
                  if (value.mode === 'static' && value.start && value.end) {
                    setCustomRange(value.start, value.end)
                  } else if (value.mode === 'live' && value.range) {
                    const matchingRange = Object.entries(TIME_RANGES).find(
                      ([_, rangeMs]) => rangeMs === value.range
                    )

                    if (matchingRange) {
                      setTimeRange(matchingRange[0] as TimeRangeKey)
                    } else {
                      const now = Date.now()
                      setCustomRange(now - value.range, now)
                    }
                  }
                }}
              >
                <Button
                  variant="ghost"
                  size="slate"
                  className={cn(
                    'text-fg-tertiary hover:text-fg-secondary py-0.5 max-md:text-[11px] max-md:px-1.5 flex-shrink-0 prose-label',
                    {
                      'text-fg prose-label-highlight':
                        currentRange === 'custom',
                    }
                  )}
                >
                  custom
                </Button>
              </TimePicker>

              {CHART_RANGE_MAP_KEYS.filter((key) => key !== 'custom').map(
                (key) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="slate"
                    className={cn(
                      'text-fg-tertiary hover:text-fg-secondary py-0.5 max-md:text-[11px] max-md:px-1.5 flex-shrink-0 prose-label',
                      {
                        'text-fg prose-label-highlight': currentRange === key,
                      }
                    )}
                    onClick={() =>
                      handleRangeChange(key as keyof typeof CHART_RANGE_MAP)
                    }
                  >
                    {key}
                  </Button>
                )
              )}
            </div>
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
        className="mt-3 md:mt-4 flex-1 max-md:min-h-[30dvh]"
      />
    </div>
  )
}
