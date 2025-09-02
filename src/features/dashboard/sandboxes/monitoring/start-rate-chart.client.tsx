'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { getAveragingPeriodText } from '@/lib/utils/sandboxes'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { SingleValueTooltip } from '@/ui/data/tooltips'
import * as echarts from 'echarts'
import { InferSafeActionFnResult } from 'next-safe-action'
import dynamic from 'next/dynamic'
import { useCallback, useMemo } from 'react'
import { renderToString } from 'react-dom/server'
import { NonUndefined } from 'react-hook-form'
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface StartRateChartProps {
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
}

const LineChart = dynamic(() => import('@/ui/data/line-chart'), {
  ssr: false,
})

export default function StartRateChartClient({
  initialData,
}: StartRateChartProps) {
  const { timeframe, setStaticMode, registerChart } = useTeamMetrics()

  let { data } = useTeamMetricsSWR(initialData)

  if (!data) {
    data = initialData
  }

  const lineData = data.metrics.map((d) => ({
    x: d.timestamp,
    y: d.sandboxStartRate,
  }))

  const average = useMemo(() => {
    if (!lineData.length) return 0

    return (
      lineData.reduce((acc, cur) => acc + (cur.y || 0), 0) / lineData.length
    )
  }, [lineData])

  const cssVars = useCssVars([
    '--graph-6',
    '--graph-area-6-from',
    '--graph-area-6-to',
  ] as const)

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
          label="sandboxes/s"
          timestamp={timestamp}
          description={getAveragingPeriodText(data.step)}
          classNames={{
            value: 'text-graph-6',
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
      <div className="min-h-[60px] flex flex-col justify-end">
        <span className="prose-label-highlight uppercase">Sandboxes/Sec.</span>
        <div className="inline-flex items-end gap-3 mt-2">
          <span className="prose-value-big">{average.toFixed(1)}</span>
          <span className="label-tertiary">
            over {getAveragingPeriodText(data.step)}
          </span>
        </div>
      </div>

      <LineChart
        className="mt-4 h-full"
        onZoomEnd={(from, end) => {
          setStaticMode(from, end)
        }}
        group="sandboxes-monitoring"
        onChartReady={registerChart}
        option={{
          xAxis: {
            type: 'time',
            min: timeframe.start,
            max: timeframe.end,
            jitterMargin: 10,
          },
          yAxis: {
            splitNumber: 2,
            max: 5,
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
            id: 'rate',
            name: 'Rate',
            data: lineData,
            lineStyle: {
              color: cssVars['--graph-6'],
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: cssVars['--graph-area-6-from'],
                },
                {
                  offset: 1,
                  color: cssVars['--graph-area-6-to'],
                },
              ]),
            },
          },
        ]}
      />
    </div>
  )
}
