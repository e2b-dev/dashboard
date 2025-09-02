'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { fillTeamMetricsWithZeros } from '@/lib/utils/sandboxes'
import {
  ResolvedTimeframe,
  resolveTimeframe,
  TimeframeState,
} from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { NonUndefined } from 'react-hook-form'
import useSWR from 'swr'
import { useTeamMetrics } from '../context'

export default function useTeamMetricsSWR(
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >,
  timeframeState?: TimeframeState
) {
  const selectedTeam = useSelectedTeam()
  let { timeframe } = useTeamMetrics()

  if (timeframeState) {
    timeframe = resolveTimeframe(timeframeState)
  }

  return useSWR<typeof initialData>(
    selectedTeam
      ? [`/api/teams/${selectedTeam?.id}/metrics`, selectedTeam?.id, timeframe]
      : null,
    async ([url, teamId, timeframe]: [string, string, ResolvedTimeframe]) => {
      if (!url || !teamId) return initialData

      const end = timeframe.isLive ? Date.now() : timeframe.end
      const start = timeframe.isLive
        ? end - (timeframe.end - timeframe.start)
        : timeframe.start

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start,
          end,
        }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to fetch metrics')
      }

      const data = (await response.json()) as TeamMetricsResponse

      if (!data.metrics) {
        return initialData
      }

      const step = data.step

      return {
        metrics: fillTeamMetricsWithZeros(
          data.metrics,
          start,
          timeframe.isLive
            ? Date.now() - TEAM_METRICS_POLLING_INTERVAL_MS
            : end,
          step
        ),
        step,
      }
    },
    {
      fallbackData: initialData,
      shouldRetryOnError: false,
      refreshInterval: timeframe.isLive ? TEAM_METRICS_POLLING_INTERVAL_MS : 0,
      keepPreviousData: true,
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )
}
