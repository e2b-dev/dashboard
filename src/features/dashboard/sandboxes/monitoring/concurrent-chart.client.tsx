'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils/ui'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { SingleValueTooltip } from '@/ui/data/tooltips'
import { Button } from '@/ui/primitives/button'
import { useMemo } from 'react'
import { renderToString } from 'react-dom/server'
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

import {
  calculateTeamMetricsStep,
  getAveragingPeriodText,
} from '@/lib/utils/sandboxes'
import { TIME_RANGES, TimeRangeKey } from '@/lib/utils/timeframe'
import dynamic from 'next/dynamic'

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
  initialData: ClientTeamMetrics
}

export default function ConcurrentChartClient({
  initialData,
}: ConcurrentChartProps) {
  const { timeframe, setStaticMode, setTimeRange } = useTeamMetrics()

  let { data } = useTeamMetricsSWR(initialData)

  if (!data) {
    data = initialData
  }

  const lineData = useMemo(
    () =>
      data?.map((d) => ({
        x: d.timestamp,
        y: d.concurrentSandboxes,
      })) || [],
    [data]
  )

  const average = useMemo(() => {
    if (!lineData.length) return 0

    return (
      lineData.reduce((acc, cur) => acc + (cur.y || 0), 0) / lineData.length
    )
  }, [lineData])

  const step = useMemo(() => {
    if (!lineData?.length || lineData.length < 2) return null

    const nonZeroPoints = lineData.filter((point) => point.y !== 0)
    if (nonZeroPoints.length >= 2) {
      return nonZeroPoints[1]!.x - nonZeroPoints[0]!.x
    }

    return calculateTeamMetricsStep(
      new Date(timeframe.start),
      new Date(timeframe.end)
    )
  }, [lineData, timeframe.start, timeframe.end])

  const cssVars = useCssVars([
    '--accent-main-highlight',
    '--graph-area-accent-main-from',
    '--graph-area-accent-main-to',
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

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <div className="flex justify-between gap-6 min-h-[60px]">
        <div className="flex flex-col justify-end">
          <span className="prose-label-highlight uppercase">Concurrent</span>
          <div className="inline-flex items-end gap-3 mt-2">
            <span className="prose-value-big">{average.toFixed(1)}</span>
            <span className="label-tertiary">AVG</span>
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
        option={{
          xAxis: {
            type: 'time',
            min: timeframe.start,
            max: timeframe.end,
          },
          yAxis: {
            splitNumber: 2,
          },
          tooltip: {
            show: true,
            formatter: (
              params: echarts.TooltipComponentFormatterCallbackParams
            ) => {
              const data = Array.isArray(params) ? params[0] : params
              if (!data?.value) return ''

              const value = Array.isArray(data.value)
                ? data.value[1]
                : data.value
              const timestamp = Array.isArray(data.value)
                ? (data.value[0] as string)
                : (data.value as string)

              return renderToString(
                <SingleValueTooltip
                  value={typeof value === 'number' ? value.toFixed(2) : 'n/a'}
                  label={
                    typeof value === 'number' && value === 1
                      ? 'concurrent sandbox'
                      : 'concurrent sandboxes'
                  }
                  timestamp={timestamp}
                  description={getAveragingPeriodText(step ?? 0)}
                  classNames={{
                    description: 'text-fg-tertiary opacity-75',
                    timestamp: 'text-fg-tertiary',
                  }}
                />
              )
            },
          },
        }}
        data={[
          {
            id: 'concurrent-sandboxes',
            name: 'Running Sandboxes',
            data: lineData,
            lineStyle: {
              color: cssVars['--accent-main-highlight'],
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
                    color: cssVars['--graph-area-accent-main-from'],
                  },
                  {
                    offset: 1,
                    color: cssVars['--graph-area-accent-main-to'],
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
