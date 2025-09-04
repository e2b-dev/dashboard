'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { NonUndefined } from 'react-hook-form'
import useSWR from 'swr'

// header metrics always show last 30 seconds regardless of selected time range
export default function useHeaderMetricsSWR(
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
) {
  const selectedTeam = useSelectedTeam()

  const swrKey = selectedTeam
    ? [
        `/api/teams/${selectedTeam?.id}/metrics/header`,
        selectedTeam?.id,
        'header-metrics',
      ]
    : null

  return useSWR<typeof initialData | undefined>(
    swrKey,
    async ([url, teamId]: [string, string, string]) => {
      if (!url || !teamId) return

      const fetchEnd = Date.now()
      const fetchStart = fetchEnd - 60_000

      const response = await fetch(url.replace('/header', ''), {
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
      refreshInterval: TEAM_METRICS_POLLING_INTERVAL_MS,
      keepPreviousData: true,
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )
}
