'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { LineChart } from '@/ui/data/line-chart'
import DefaultTooltip from '@/ui/data/tooltips'
import { Badge } from '@/ui/primitives/badge'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useMemo } from 'react'
import { renderToString } from 'react-dom/server'
import { useTeamMetrics } from './context'
import { useFillTeamMetricsData } from './hooks/use-fill-team-metrics-data'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface ConcurrentChartProps {
  initialData: InferSafeActionFnResult<typeof getTeamMetrics>['data']
}

export default function ConcurrentChartClient({
  initialData,
}: ConcurrentChartProps) {
  const { chartsStart: start, chartsEnd: end } = useTeamMetrics()
  const { data } = useTeamMetricsSWR(initialData, { start, end })

  const filledData = useFillTeamMetricsData(data || [], start, end)

  const { chartStart, chartEnd } = useMemo(() => {
    if (!filledData.length) return { chartStart: start, chartEnd: end }

    const firstTimestamp = filledData[0]?.timestamp || start
    const lastTimestamp = filledData[filledData.length - 1]?.timestamp || end

    return { chartStart: firstTimestamp, chartEnd: lastTimestamp }
  }, [filledData, start, end])

  const lineData = filledData.map((d) => ({
    x: d.timestamp,
    y: d.concurrentSandboxes,
  }))

  const average = useMemo(() => {
    if (!lineData?.length) return 0

    return (
      lineData.reduce((acc, cur) => acc + (cur.y || 0), 0) / lineData.length
    )
  }, [lineData])

  const cssVars = useCssVars(
    ['--accent-main-highlight', '--accent-main-bg'],
    []
  )

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <span className="prose-label-highlight uppercase">Concurrent</span>
      <div className="inline-flex items-end gap-3 mt-2">
        <span className="prose-value-big">{average.toFixed(1)}</span>
        <span className="label-tertiary">AVG</span>
      </div>

      <LineChart
        xType="time"
        className="mt-4 h-full"
        curve="step"
        optionOverrides={{
          yAxis: {
            splitNumber: 2,
          },
          xAxis: {
            min: chartStart,
            max: chartEnd,
          },
        }}
        tooltipFormatter={(
          params: echarts.TooltipComponentFormatterCallbackParams
        ) => {
          // normalize params to an array
          params = params instanceof Array ? params : [params]
          const first = params[0]!

          const label = (() => {
            const xValue = (first.value as Array<unknown>)?.[
              first.encode!.x![0]!
            ]
            if (!xValue) return 'n/a'

            const date = new Date(xValue as number)
            const day = date.getDate()
            const month = date.toLocaleDateString('en-US', {
              month: 'short',
            })
            const time = date.toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            })
            return `${day} ${month} - ${time}`
          })()

          const items = params.map((p) => ({
            label: (
              <Badge variant="main" className="uppercase">
                {p.seriesName ?? 'n/a'}
              </Badge>
            ),
            value: (p.value as Array<number>)?.[
              p.encode!.y![0]!
            ]?.toLocaleString(),
          }))

          return renderToString(<DefaultTooltip label={label} items={items} />)
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
              color: cssVars['--accent-main-bg'],
            },
          },
        ]}
      />
    </div>
  )
}
