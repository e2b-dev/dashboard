'use client'

import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import {
  formatAveragingPeriod,
  formatCompactDate,
  formatDecimal,
} from '@/lib/utils/formatting'
import {
  ParsedTimeframe,
  TIME_RANGES,
  TimeRangeKey,
} from '@/lib/utils/timeframe'
import { cn } from '@/lib/utils/ui'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { ClientTeamMetric } from '@/types/sandboxes.types'
import LineChart from '@/ui/data/line-chart'
import HelpTooltip from '@/ui/help-tooltip'
import { ReactiveLiveBadge } from '@/ui/live'
import { Button } from '@/ui/primitives/button'
import { TimePicker } from '@/ui/time-picker'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useMemo } from 'react'
import { NonUndefined } from 'react-hook-form'
import {
  calculateAverage,
  calculateYAxisMax,
  createChartSeries,
  createMonitoringChartOptions,
  createSingleValueTooltipFormatter,
  fillMetricsWithZeros,
  transformMetricsToLineData,
} from './chart-utils'
import { useSyncedMetrics } from './hooks/use-synced-metrics'
import { useTeamMetrics } from './store'

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
  initialTimeframe: ParsedTimeframe
  concurrentInstancesLimit?: number
}

export default function ConcurrentChartClient({
  teamId,
  initialData,
  initialTimeframe,
  concurrentInstancesLimit,
}: ConcurrentChartProps) {
  const {
    timeframe,
    setStaticMode,
    setTimeRange,
    setCustomRange,
    registerChart,
  } = useTeamMetrics()

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

    // fill zeros before transforming to line data
    const filledMetrics = fillMetricsWithZeros(
      data.metrics,
      timeframe.start,
      timeframe.end,
      data.step
    )

    return transformMetricsToLineData<ClientTeamMetric>(
      filledMetrics,
      (d) => d.timestamp,
      (d) => d.concurrentSandboxes
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.metrics, data?.step])

  const average = useMemo(() => calculateAverage(lineData), [lineData])

  const cssVars = useCssVars([
    '--accent-positive-highlight',
    '--graph-area-accent-positive-from',
    '--graph-area-accent-positive-to',
  ] as const)

  const currentRange = useMemo(() => {
    // if in static mode, always show custom
    if (!syncedTimeframe.isLive) {
      return 'custom'
    }

    const currentSpan = syncedTimeframe.duration
    const now = Date.now()

    // for live mode, check if this matches a standard "last X" pattern
    // this means the end should be "now" and start should be "now - duration"
    const endIsNow = Math.abs(syncedTimeframe.end - now) < 10000 // within 10 seconds

    if (!endIsNow) {
      // if end is not "now", it's a custom range
      return 'custom'
    }

    // check if the duration matches a predefined range
    const exactMatch = Object.entries(TIME_RANGES).find(
      ([_, value]) => Math.abs(value - currentSpan) < 1000 // allow 1 second tolerance
    )

    if (exactMatch) {
      // verify the start time is what we'd expect for this range
      const expectedStart = now - exactMatch[1]
      const startMatches =
        Math.abs(syncedTimeframe.start - expectedStart) < 10000 // within 10 seconds

      if (startMatches) {
        return exactMatch[0]
      }
    }

    // doesn't match a standard pattern, so it's custom
    return 'custom'
  }, [syncedTimeframe])

  const customRangeLabel = useMemo(() => {
    // always show the date range when not in a standard time range
    // or when in static mode (custom time selection)
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

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1 md:min-h-0">
      <div className="flex max-md:flex-col md:justify-between gap-3 md:gap-6 md:min-h-[60px]">
        <div className="flex flex-col justify-end">
          <span className="prose-label-highlight uppercase max-md:text-sm">
            Concurrent Sandboxes
            <HelpTooltip
              classNames={{ icon: 'text-accent-positive-highlight' }}
              trigger={<ReactiveLiveBadge show={isPolling} />}
            >
              This data is updated every{' '}
              {TEAM_METRICS_POLLING_INTERVAL_MS / 1000} seconds.
            </HelpTooltip>
          </span>
          <div className="inline-flex items-end gap-2 md:gap-3 mt-1 md:mt-2">
            <span className="prose-value-big max-md:text-2xl">
              {formatDecimal(average, 1)}
            </span>
            <span className="label-tertiary max-md:text-xs">
              <span className="max-md:hidden">
                over {formatAveragingPeriod(data?.step || 0)}
              </span>
              <span className="md:hidden">avg</span>
            </span>
          </div>
        </div>

        <div className="flex items-end gap-1 md:gap-3 flex-shrink-0 max-md:flex-wrap max-md:justify-start">
          {customRangeLabel && (
            <span
              className="text-fg py-0.5 max-md:text-xs max-md:w-full max-md:mb-1"
              style={{ letterSpacing: '0%' }}
            >
              {customRangeLabel}
            </span>
          )}
          <TimePicker
            value={{
              mode: syncedTimeframe.isLive ? 'live' : 'static',
              range: syncedTimeframe.duration,
              start: syncedTimeframe.start,
              end: syncedTimeframe.end,
            }}
            onValueChange={(value) => {
              if (value.mode === 'static' && value.start && value.end) {
                // handle static mode (custom start/end times)
                setStaticMode(value.start, value.end)
              } else if (value.mode === 'live' && value.range) {
                // handle live mode
                // check if this range matches a predefined time range
                const matchingRange = Object.entries(TIME_RANGES).find(
                  ([_, rangeMs]) => rangeMs === value.range
                )

                if (matchingRange) {
                  // use the predefined range
                  setTimeRange(matchingRange[0] as TimeRangeKey)
                } else {
                  // use custom range for non-standard selections
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
                'text-fg-tertiary hover:text-fg-secondary px-1 py-0.5 max-md:text-xs max-md:px-2',
                {
                  'text-fg': currentRange === 'custom',
                }
              )}
            >
              custom
            </Button>
          </TimePicker>
          {CHART_RANGE_MAP_KEYS.filter((key) => key !== 'custom').map((key) => (
            <Button
              key={key}
              variant="ghost"
              size="slate"
              className={cn(
                'text-fg-tertiary hover:text-fg-secondary px-1 py-0.5 max-md:text-xs max-md:px-2',
                {
                  'text-fg': currentRange === key,
                }
              )}
              onClick={() =>
                handleRangeChange(key as keyof typeof CHART_RANGE_MAP)
              }
            >
              {key}
            </Button>
          ))}
        </div>
      </div>

      <LineChart
        className="mt-3 md:mt-4 flex-1 max-md:min-h-[30dvh]"
        onZoomEnd={(from, end) => {
          setStaticMode(from, end)
        }}
        yAxisLimit={concurrentInstancesLimit}
        group="sandboxes-monitoring"
        onChartReady={registerChart}
        duration={syncedTimeframe.duration}
        option={{
          ...createMonitoringChartOptions({
            timeframe: {
              start: lineData[0]?.x as number,
              end: lineData[lineData.length - 1]?.x as number,
              isLive: syncedTimeframe.isLive,
            },
          }),
          yAxis: {
            splitNumber: 3,
            max: calculateYAxisMax(lineData, concurrentInstancesLimit || 100),
          },
          tooltip: {
            show: true,
            trigger: 'axis',
            formatter: tooltipFormatter,
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
