"use client"

import { ChartPlaceholder } from '@/ui/chart-placeholder'
import { LineChart, LinePoint } from '@/ui/data/line-chart'
import { useMemo } from 'react'
import { InferSafeActionFnResult } from 'next-safe-action'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface StartRateChartProps {
  initialData: InferSafeActionFnResult<typeof getTeamMetrics>['data']
}

export default function StartRateChartClient({ initialData }: StartRateChartProps) {
  const { chartsStart, chartsEnd } = useTeamMetrics()
  const { data } = useTeamMetricsSWR(initialData, { start: chartsStart, end: chartsEnd })

  const lineData: LinePoint[] | undefined = data?.map((point) => ({ x: point.timestamp, y: point.sandboxStartRate }))

  const average = useMemo(() => {
    if (!lineData?.length) return 0

    return lineData.reduce((acc, cur) => acc + (cur.y || 0), 0) / lineData.length
  }, [lineData])

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <span className="prose-label-highlight uppercase">Start Rate</span>
      <div className="inline-flex items-end gap-3 mt-2">
        <span className="prose-value-big">{average.toFixed(1)}</span>
        <span className="label-tertiary">AVG</span>
      </div>
      {!lineData || lineData.length === 0 ? (
        <ChartPlaceholder
          classNames={{
            container: 'self-center max-h-60 h-full',
          }}
        />
      ) : (
        <LineChart
          className="mt-4 h-full"
          optionOverrides={{
            yAxis: {
              splitNumber: 2,
            },
            xAxis: {
              min: chartsStart,
              max: chartsEnd,
              type: 'time'
            }
          }}
          data={[
            {
              id: 'rate',
              name: 'Rate',
              data: lineData,
            },
          ]}
        />
      )}
    </div>
  )
}
