'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { calculateTeamMetricsStep } from '@/lib/utils/sandboxes'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { SingleValueTooltip } from '@/ui/data/tooltips'
import * as echarts from 'echarts'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
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

  // Calculate the averaging period for the tooltip
  const getAveragingPeriodText = (timestamp: number) => {
    const step = calculateTeamMetricsStep(
      new Date(timeframe.start),
      new Date(timeframe.end)
    )

    const seconds = Math.floor(step / 1000)
    if (seconds < 60) {
      return `${seconds} second average`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      return `${minutes} minute average`
    } else {
      const hours = Math.floor(seconds / 3600)
      return `${hours} hour average`
    }
  }

  const cssVars = useCssVars([
    '--fg',
    '--graph-area-fg-from',
    '--graph-area-fg-to',
  ] as const)

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <div className="min-h-[60px] flex flex-col justify-end">
        <span className="prose-label-highlight uppercase">Start Rate</span>
        <div className="inline-flex items-end gap-3 mt-2">
          <span className="prose-value-big">{average.toFixed(1)}</span>
          <span className="label-tertiary">AVG</span>
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
                  label="sandboxes/s"
                  timestamp={timestamp}
                  description={getAveragingPeriodText(Number(timestamp))}
                  classNames={{
                    value: 'text-fg',
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
