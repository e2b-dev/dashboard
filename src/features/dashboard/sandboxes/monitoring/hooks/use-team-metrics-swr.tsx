'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { NonUndefined } from 'react-hook-form'
import useSWR from 'swr'
import { useTeamMetrics } from '../store'

export default function useTeamMetricsSWR(
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
) {
  const selectedTeam = useSelectedTeam()
  const { timeframe } = useTeamMetrics()

  // create a stable key that changes when timeframe values change
  const swrKey = selectedTeam
    ? [
        `/api/teams/${selectedTeam?.id}/metrics`,
        selectedTeam?.id,
        timeframe.start,
        timeframe.end,
        timeframe.isLive,
      ]
    : null

  return useSWR<typeof initialData | undefined>(
    swrKey,
    async ([url, teamId, startTime, endTime, isLive]: [
      string,
      string,
      number,
      number,
      boolean,
    ]) => {
      if (!url || !teamId) return

      // for live mode, use current time for the actual fetch
      const fetchEnd = isLive ? Date.now() : endTime
      const fetchStart = isLive ? fetchEnd - (endTime - startTime) : startTime

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: fetchStart,
          end: fetchEnd,
        }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to fetch metrics')
      }

      const data = (await response.json()) as TeamMetricsResponse

      if (!data.metrics) {
        return
      }

      return data
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
