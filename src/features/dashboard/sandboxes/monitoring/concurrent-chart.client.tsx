'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import {
  formatAveragingPeriod,
  formatCompactDate,
  formatDecimal,
} from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import { SingleValueTooltip } from '@/ui/data/tooltips'
import { Button } from '@/ui/primitives/button'
import { useCallback, useMemo } from 'react'
import { renderToString } from 'react-dom/server'
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

import { TIME_RANGES, TimeRangeKey } from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import dynamic from 'next/dynamic'
import { NonUndefined } from 'react-hook-form'

const LineChart = dynamic(() => import('@/ui/data/line-chart'), {
  ssr: false,
})

const CHART_RANGE_MAP = {
  custom: null,
  ...TIME_RANGES,
} as const

const CHART_RANGE_MAP_KEYS = Object.keys(CHART_RANGE_MAP) as Array<
  keyof typeof CHART_RANGE_MAP
>

interface ConcurrentChartProps {
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
  concurrentInstancesLimit?: number
}

export default function ConcurrentChartClient({
  initialData,
  concurrentInstancesLimit,
}: ConcurrentChartProps) {
  const { timeframe, setStaticMode, setTimeRange, registerChart } =
    useTeamMetrics()

  let { data } = useTeamMetricsSWR(initialData)

  if (!data) {
    data = initialData
  }

  const lineData = useMemo(
    () =>
      data.metrics.map((d) => ({
        x: d.timestamp,
        y: d.concurrentSandboxes,
      })),
    [data]
  )

  const average = useMemo(() => {
    if (!lineData.length) return 0

    return (
      lineData.reduce((acc, cur) => acc + (cur.y || 0), 0) / lineData.length
    )
  }, [lineData])

  const cssVars = useCssVars([
    '--accent-positive-highlight',
    '--graph-area-accent-positive-from',
    '--graph-area-accent-positive-to',
  ] as const)

  const currentRange = useMemo(() => {
    if (!timeframe.isLive) return 'custom'
    const entry = Object.entries(TIME_RANGES).find(
      ([_, value]) => value === timeframe.end - timeframe.start
    )
    return entry ? entry[0] : CHART_RANGE_MAP_KEYS[0]
  }, [timeframe])

  const customRangeLabel = useMemo(() => {
    if (currentRange !== 'custom') return null
    return `${formatCompactDate(timeframe.start)} - ${formatCompactDate(timeframe.end)}`
  }, [currentRange, timeframe.start, timeframe.end])

  const handleRangeChange = (range: keyof typeof CHART_RANGE_MAP) => {
    if (range === 'custom') return
    setTimeRange(range as TimeRangeKey)
  }

  const tooltipFormatter = useCallback(
    (params: echarts.TooltipComponentFormatterCallbackParams) => {
      const paramsData = Array.isArray(params) ? params[0] : params
      if (!paramsData?.value) return ''

      const value = Array.isArray(paramsData.value)
        ? paramsData.value[1]
        : paramsData.value
      const timestamp = Array.isArray(paramsData.value)
        ? (paramsData.value[0] as string)
        : (paramsData.value as string)

      return renderToString(
        <SingleValueTooltip
          value={typeof value === 'number' ? value : 'n/a'}
          label={
            typeof value === 'number' && value === 1
              ? 'concurrent sandbox'
              : 'concurrent sandboxes'
          }
          timestamp={timestamp}
          description={formatAveragingPeriod(data.step)}
          classNames={{
            value: 'text-accent-positive-highlight',
          }}
        />
      )
    },
    [data.step]
  )

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1 max-md:min-h-[400px] md:min-h-0">
      <div className="flex max-md:flex-col md:justify-between gap-3 md:gap-6 md:min-h-[60px]">
        <div className="flex flex-col justify-end">
          <span className="prose-label-highlight uppercase max-md:text-sm">
            Concurrent Sandboxes
          </span>
          <div className="inline-flex items-end gap-2 md:gap-3 mt-1 md:mt-2">
            <span className="prose-value-big max-md:text-2xl">
              {formatDecimal(average, 1)}
            </span>
            <span className="label-tertiary max-md:text-xs">
              <span className="max-md:hidden">
                over {formatAveragingPeriod(data.step)}
              </span>
              <span className="md:hidden">avg</span>
            </span>
          </div>
        </div>

        <div className="flex items-end gap-1 md:gap-3 flex-shrink-0 max-md:flex-wrap max-md:justify-start">
          {currentRange === 'custom' && customRangeLabel && (
            <span
              className="text-fg py-0.5 max-md:text-xs max-md:w-full max-md:mb-1"
              style={{ letterSpacing: '0%' }}
            >
              {customRangeLabel}
            </span>
          )}
          {CHART_RANGE_MAP_KEYS.map((key) => (
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
        className="mt-3 md:mt-4 flex-1 min-h-[250px] md:min-h-[300px]"
        onZoomEnd={(from, end) => {
          setStaticMode(from, end)
        }}
        yAxisLimit={concurrentInstancesLimit}
        group="sandboxes-monitoring"
        onChartReady={registerChart}
        option={{
          xAxis: {
            type: 'time',
            min: timeframe.start,
            max: timeframe.end,
          },
          yAxis: {
            splitNumber: 3,
            max: Math.min(
              Math.max(...lineData.map((d) => d.y || 0)) * 1.25,
              concurrentInstancesLimit || 100
            ),
          },
          tooltip: {
            show: true,
            trigger: 'axis',
            axisPointer: {
              type: 'line',
            },
            formatter: tooltipFormatter,
          },
        }}
        data={[
          {
            id: 'concurrent-sandboxes',
            name: 'Running Sandboxes',
            data: lineData,
            lineStyle: {
              color: cssVars['--accent-positive-highlight'],
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  {
                    offset: 0,
                    color: cssVars['--graph-area-accent-positive-from'],
                  },
                  {
                    offset: 1,
                    color: cssVars['--graph-area-accent-positive-to'],
                  },
                ],
              },
            },
          },
        ]}
      />
    </div>
  )
}
