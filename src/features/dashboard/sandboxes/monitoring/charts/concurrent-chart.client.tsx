'use client'

import { calculateStepForDuration } from '@/features/dashboard/sandboxes/monitoring/utils'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils'
import { createSingleValueTooltipFormatter } from '@/lib/utils/chart'
import {
  formatAxisNumber,
  formatCompactDate,
  formatDecimal,
} from '@/lib/utils/formatting'
import {
  TIME_RANGES,
  TimeRangeKey,
  formatTimeframeAsISO8601Interval,
} from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { ClientTeamMetric } from '@/types/sandboxes.types'
import LineChart from '@/ui/charts/line-chart'
import CopyButton from '@/ui/copy-button'
import { ReactiveLiveBadge } from '@/ui/live'
import { Button } from '@/ui/primitives/button'
import { ECharts } from 'echarts'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useEffect, useMemo, useRef } from 'react'
import { NonUndefined } from 'react-hook-form'
import { useSyncedMetrics } from '../hooks/use-synced-metrics'
import { useTeamMetrics } from '../store'
import { TimePicker } from '../time-picker'
import {
  calculateCentralTendency,
  calculateYAxisMax,
  createChartSeries,
  createMonitoringChartOptions,
  transformMetricsToLineData,
} from './utils'

const CHART_RANGE_MAP = {
  custom: null,
  ...TIME_RANGES,
} as const

const CHART_RANGE_MAP_KEYS = Object.keys(CHART_RANGE_MAP) as Array<
  keyof typeof CHART_RANGE_MAP
>

interface ConcurrentChartProps {
  teamId: string
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
  concurrentInstancesLimit?: number
}

export default function ConcurrentChartClient({
  teamId,
  initialData,
  concurrentInstancesLimit,
}: ConcurrentChartProps) {
  const chartRef = useRef<ECharts | null>(null)
  const isRegisteredRef = useRef(false)

  const {
    timeframe,
    setStaticMode,
    setTimeRange,
    setCustomRange,
    registerChart,
    unregisterChart,
  } = useTeamMetrics()

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current && isRegisteredRef.current) {
        unregisterChart(chartRef.current)
        chartRef.current = null
        isRegisteredRef.current = false
      }
    }
  }, [unregisterChart])

  // create a complete timeframe object for the hook
  // always use store timeframe as it's the source of truth
  const syncedTimeframe = useMemo(() => {
    return {
      start: timeframe.start,
      end: timeframe.end,
      isLive: timeframe.isLive,
      duration: timeframe.end - timeframe.start,
    }
  }, [timeframe.start, timeframe.end, timeframe.isLive])

  // use synced metrics hook for consistent fetching
  const { data, isPolling } = useSyncedMetrics({
    teamId,
    timeframe: syncedTimeframe,
    initialData,
  })

  const lineData = useMemo(() => {
    if (!data?.metrics || !data?.step) {
      return []
    }

    return transformMetricsToLineData<ClientTeamMetric>(
      data.metrics,
      (d) => d.timestamp,
      (d) => d.concurrentSandboxes
    )
  }, [data?.metrics, data?.step])

  const centralTendency = useMemo(
    () => calculateCentralTendency(lineData, 'average'),
    [lineData]
  )

  const cssVars = useCssVars([
    '--accent-positive-highlight',
    '--graph-area-accent-positive-from',
    '--graph-area-accent-positive-to',
  ] as const)

  const currentRange = useMemo(() => {
    const currentDuration = syncedTimeframe.duration

    // calculate tolerance to account for rounding errors
    const step = calculateStepForDuration(currentDuration)
    const tolerance = step * 1.5

    const matchingRange = Object.entries(TIME_RANGES).find(
      ([_, rangeMs]) => Math.abs(rangeMs - currentDuration) < tolerance
    )

    return matchingRange ? matchingRange[0] : 'custom'
  }, [syncedTimeframe.duration])

  const customRangeLabel = useMemo(() => {
    if (!syncedTimeframe.isLive || currentRange === 'custom') {
      return `${formatCompactDate(syncedTimeframe.start)} - ${formatCompactDate(syncedTimeframe.end)}`
    }
    return null
  }, [
    currentRange,
    syncedTimeframe.start,
    syncedTimeframe.end,
    syncedTimeframe.isLive,
  ])

  const customRangeCopyValue = useMemo(() => {
    if (!syncedTimeframe.isLive || currentRange === 'custom') {
      return formatTimeframeAsISO8601Interval(
        syncedTimeframe.start,
        syncedTimeframe.end
      )
    }
    return null
  }, [
    currentRange,
    syncedTimeframe.start,
    syncedTimeframe.end,
    syncedTimeframe.isLive,
  ])

  const handleRangeChange = (range: keyof typeof CHART_RANGE_MAP) => {
    if (range === 'custom') return
    setTimeRange(range as TimeRangeKey)
  }

  const tooltipFormatter = useMemo(
    () =>
      createSingleValueTooltipFormatter({
        step: data?.step || 0,
        label: (value: number) =>
          value === 1 ? 'concurrent sandbox' : 'concurrent sandboxes',
        valueClassName: 'text-accent-positive-highlight',
      }),
    [data?.step]
  )

  if (!data) return null

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1 md:min-h-0">
      <div className="flex flex-col gap-2">
        <div className="prose-label-highlight uppercase max-md:text-sm flex justify-between items-center">
          <span>Concurrent sandboxes</span>
          <ReactiveLiveBadge
            show={isPolling}
          />
        </div>
        <div className="flex justify-between max-md:flex-col max-md:gap-2">
          <div className="inline-flex items-end gap-2">
            <span className="prose-value-big max-md:text-2xl">
              {formatAxisNumber(centralTendency.value)}
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
                  mode: syncedTimeframe.isLive ? 'live' : 'static',
                  range: syncedTimeframe.duration,
                  start: syncedTimeframe.start,
                  end: syncedTimeframe.end,
                }}
                onValueChange={(value) => {
                  if (value.mode === 'static' && value.start && value.end) {
                    setStaticMode(value.start, value.end)
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
                      'text-fg prose-label-highlight': currentRange === 'custom',
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

      <LineChart
        className="mt-3 md:mt-4 flex-1 max-md:min-h-[30dvh]"
        onZoomEnd={(from, end) => {
          setStaticMode(from, end)
        }}
        yAxisLimit={concurrentInstancesLimit}
        group="sandboxes-monitoring"
        onChartReady={(chart) => {
          // if we have a previous chart instance that's different, unregister it
          if (
            chartRef.current &&
            chartRef.current !== chart &&
            isRegisteredRef.current
          ) {
            unregisterChart(chartRef.current)
            isRegisteredRef.current = false
          }

          // only register if this is a new chart instance
          if (!isRegisteredRef.current || chartRef.current !== chart) {
            chartRef.current = chart
            registerChart(chart)
            isRegisteredRef.current = true
          }
        }}
        duration={syncedTimeframe.duration}
        syncAxisPointers={true}
        showTooltip={true}
        tooltipFormatter={tooltipFormatter}
        option={{
          ...createMonitoringChartOptions({
            timeframe: {
              start:
                lineData.length > 0
                  ? (lineData[0]?.x as number)
                  : timeframe.start,
              end:
                lineData.length > 0
                  ? (lineData[lineData.length - 1]?.x as number)
                  : timeframe.end,
              isLive: syncedTimeframe.isLive,
            },
          }),
          yAxis: {
            splitNumber: 2,
            max: calculateYAxisMax(lineData, concurrentInstancesLimit),
            axisLabel: {
              formatter: (value: number) => {
                // Hide labels that are too close to the limit line
                if (concurrentInstancesLimit !== undefined) {
                  const tolerance = concurrentInstancesLimit * 0.1 // 10% tolerance
                  const minDistance = Math.max(
                    tolerance,
                    concurrentInstancesLimit * 0.05
                  ) // At least 5% distance

                  if (
                    Math.abs(value - concurrentInstancesLimit) <= minDistance
                  ) {
                    return '' // Hide the label
                  }
                }
                return formatAxisNumber(value)
              },
            },
          },
          grid: {
            left: 40,
          },
        }}
        data={[
          createChartSeries({
            id: 'concurrent-sandboxes',
            name: 'Running Sandboxes',
            data: lineData,
            lineColor: cssVars['--accent-positive-highlight'],
            areaColors: {
              from: cssVars['--graph-area-accent-positive-from'],
              to: cssVars['--graph-area-accent-positive-to'],
            },
          }),
        ]}
      />
    </div>
  )
}
