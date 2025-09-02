'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import {
  calculateTeamMetricsStep,
  getAveragingPeriodText,
} from '@/lib/utils/sandboxes'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { SingleValueTooltip } from '@/ui/data/tooltips'
import * as echarts from 'echarts'
import dynamic from 'next/dynamic'
import { useCallback, useMemo } from 'react'
import { renderToString } from 'react-dom/server'
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface StartRateChartProps {
  initialData: ClientTeamMetrics
}

const LineChart = dynamic(() => import('@/ui/data/line-chart'), {
  ssr: false,
})

export default function StartRateChartClient({
  initialData,
}: StartRateChartProps) {
  const { timeframe, setStaticMode } = useTeamMetrics()

  let { data } = useTeamMetricsSWR(initialData)

  if (!data) {
    data = initialData
  }

  const lineData = data?.map((d) => ({
    x: d.timestamp,
    y: d.sandboxStartRate,
  }))

  const average = useMemo(() => {
    if (!lineData?.length) return 0

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
    '--fg',
    '--graph-area-fg-from',
    '--graph-area-fg-to',
  ] as const)

  const tooltipFormatter = useCallback(
    (params: echarts.TooltipComponentFormatterCallbackParams) => {
      const data = Array.isArray(params) ? params[0] : params
      if (!data?.value) return ''

      const value = Array.isArray(data.value) ? data.value[1] : data.value
      const timestamp = Array.isArray(data.value)
        ? (data.value[0] as string)
        : (data.value as string)

      return renderToString(
        <SingleValueTooltip
          value={typeof value === 'number' ? value : 'n/a'}
          label="sandboxes/s"
          timestamp={timestamp}
          description={getAveragingPeriodText(step ?? 0)}
          classNames={{
            value: 'text-fg',
            description: 'text-fg-tertiary opacity-75',
            timestamp: 'text-fg-tertiary',
          }}
        />
      )
    },
    [step]
  )

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <div className="min-h-[60px] flex flex-col justify-end">
        <span className="prose-label-highlight uppercase">Start Rate</span>
        <div className="inline-flex items-end gap-3 mt-2">
          <span className="prose-value-big">{average.toFixed(1)}</span>
          <span className="label-tertiary">
            AVG over {getAveragingPeriodText(step ?? 0)}
          </span>
        </div>
      </div>

      <LineChart
        className="mt-4 h-full"
        onZoomEnd={(from, end) => {
          setStaticMode(from, end)
        }}
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
            formatter: tooltipFormatter,
          },
        }}
        data={[
          {
            id: 'rate',
            name: 'Rate',
            data: lineData,
            lineStyle: {
              color: cssVars['--fg'],
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: cssVars['--graph-area-fg-from'],
                },
                {
                  offset: 1,
                  color: cssVars['--graph-area-fg-to'],
                },
              ]),
            },
          },
        ]}
      />
    </div>
  )
}
