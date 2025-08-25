'use client'

import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { LineChart } from '@/ui/data/line-chart'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useMemo } from 'react'
import { useTeamMetrics } from './context'
import { useFillTeamMetricsData } from './hooks/use-fill-team-metrics-data'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface StartRateChartProps {
  initialData: InferSafeActionFnResult<typeof getTeamMetrics>['data']
}

export default function StartRateChartClient({
  initialData,
}: StartRateChartProps) {
  const { chartsStart: start, chartsEnd: end } = useTeamMetrics()
  const { data } = useTeamMetricsSWR(initialData, {
    start,
    end,
  })

  const filledData = useFillTeamMetricsData(data || [], start, end)

  const { chartStart, chartEnd } = useMemo(() => {
    if (!filledData.length) return { chartStart: start, chartEnd: end }

    const firstTimestamp = filledData[0]?.timestamp || start
    const lastTimestamp = filledData[filledData.length - 1]?.timestamp || end

    return { chartStart: firstTimestamp, chartEnd: lastTimestamp }
  }, [filledData, start, end])

  const lineData = filledData.map((d) => ({
    x: d.timestamp,
    y: d.sandboxStartRate,
  }))

  const average = useMemo(() => {
    if (!lineData?.length) return 0

    return (
      lineData.reduce((acc, cur) => acc + (cur.y || 0), 0) / lineData.length
    )
  }, [lineData])

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <span className="prose-label-highlight uppercase">Start Rate</span>
      <div className="inline-flex items-end gap-3 mt-2">
        <span className="prose-value-big">{average.toFixed(1)}</span>
        <span className="label-tertiary">AVG</span>
      </div>

      <LineChart
        xType="time"
        className="mt-4 h-full"
        optionOverrides={{
          yAxis: {
            splitNumber: 2,
          },
          xAxis: {
            min: chartStart,
            max: chartEnd,
          },
        }}
        data={[
          {
            id: 'rate',
            name: 'Rate',
            data: lineData,
          },
        ]}
      />
    </div>
  )
}
