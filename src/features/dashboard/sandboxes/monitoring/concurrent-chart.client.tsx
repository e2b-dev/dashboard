'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils/ui'
import { SingleValueTooltip } from '@/ui/data/tooltips'
import { Button } from '@/ui/primitives/button'
import { useCallback, useMemo } from 'react'
import { renderToString } from 'react-dom/server'
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

import { getAveragingPeriodText } from '@/lib/utils/sandboxes'
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
}

export default function ConcurrentChartClient({
  initialData,
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
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp)
      const now = new Date()

      // if same year, omit year
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        })
      }

      // otherwise show full date
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    }

    return `${formatDate(timeframe.start)} - ${formatDate(timeframe.end)}`
  }, [currentRange, timeframe.start, timeframe.end])

  const handleRangeChange = (range: keyof typeof CHART_RANGE_MAP) => {
    if (range === 'custom') return // Custom range is set via zoom
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
          description={getAveragingPeriodText(data.step)}
          classNames={{
            value: 'text-accent-positive-highlight',
            description: 'text-fg-tertiary opacity-75',
            timestamp: 'text-fg-tertiary',
          }}
        />
      )
    },
    [data.step]
  )

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <div className="flex justify-between gap-6 min-h-[60px]">
        <div className="flex flex-col justify-end">
          <span className="prose-label-highlight uppercase">
            Concurrent Sandboxes
          </span>
          <div className="inline-flex items-end gap-3 mt-2">
            <span className="prose-value-big">{average.toFixed(1)}</span>
            <span className="label-tertiary">
              over {getAveragingPeriodText(data.step)}
            </span>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-shrink-0">
          {currentRange === 'custom' && customRangeLabel && (
            <span className="text-fg py-0.5" style={{ letterSpacing: '0%' }}>
              {customRangeLabel}
            </span>
          )}
          {CHART_RANGE_MAP_KEYS.map((key) => (
            <Button
              key={key}
              variant="ghost"
              size="slate"
              className={cn(
                'text-fg-tertiary hover:text-fg-secondary px-1 py-0.5',
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
        className="mt-4 h-full"
        onZoomEnd={(from, end) => {
          setStaticMode(from, end)
        }}
        yAxisLimit={100}
        group="sandboxes-monitoring"
        onChartReady={registerChart}
        option={{
          xAxis: {
            type: 'time',
            min: timeframe.start,
            max: timeframe.end,
          },
          yAxis: {
            splitNumber: 2,
            max: Math.max(...lineData.map((d) => (d.y || 0) * 1.25), 100),
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
