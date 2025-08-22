"use client"

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { ChartPlaceholder } from '@/ui/chart-placeholder'
import { LineChart, LinePoint } from '@/ui/data/line-chart'
import useSWR from 'swr'
import { useMemo } from 'react'
import { InferSafeActionFnResult } from 'next-safe-action'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { useTeamMetrics } from './context'

interface ConcurrentChartProps {
  initialData: InferSafeActionFnResult<typeof getTeamMetrics>['data']
}

export default function ConcurrentChartClient({ initialData }: ConcurrentChartProps) {
  const selectedTeam = useSelectedTeam()
  const { concurrentSandboxesStart: start, concurrentSandboxesEnd: end } = useTeamMetrics()

  const { data } = useSWR<typeof initialData>(
    [`/api/teams/${selectedTeam?.id}/metrics`, selectedTeam, start, end],
    async ([url, team, start, end]) => {
      if (!url) return []

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ start, end }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const { error } = await response.json()

        throw new Error(error || 'Failed to fetch metrics')
      }

      const data = (await response.json()) as TeamMetricsResponse

      return data.metrics
    },
    {
      fallbackData: initialData,
    }
  )

  const lineData: LinePoint[] | undefined = data?.map(d => ({ x: d.timestamp, y: d.concurrentSandboxes }))

  const average = useMemo(() => {
    if (!lineData?.length) return 0

    return lineData.reduce((acc, cur) => acc + (cur.y || 0), 0) / lineData.length
  }, [lineData])

  return (
    <div className="p-3 md:p-6 border-b w-full flex flex-col flex-1">
      <span className="prose-label-highlight uppercase">Concurrent</span>
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
              min: start,
              max: end,


              type: 'time'
            }
          }}
          data={[
            {
              id: 'sandboxes',
              name: 'Sandboxes',
              data: lineData,
            },
          ]}
        />
      )}
    </div>
  )
}
