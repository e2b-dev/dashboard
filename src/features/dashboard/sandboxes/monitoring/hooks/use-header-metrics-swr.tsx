'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { SWR_KEYS } from '@/configs/keys'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { NonUndefined } from 'react-hook-form'
import useSWR from 'swr'

// header metrics always show last 60 seconds regardless of selected time range
export default function useHeaderMetricsSWR(
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
) {
  const selectedTeam = useSelectedTeam()

  // use shared key for recent metrics - all components will share the cache
  const swrKey = selectedTeam
    ? SWR_KEYS.TEAM_METRICS_RECENT(selectedTeam.id)
    : null

  return useSWR<typeof initialData | undefined>(
    swrKey,
    async ([url, teamId, type]: readonly unknown[]) => {
      if (!url || !teamId) return

      const fetchEnd = Date.now()
      const fetchStart = fetchEnd - 60_000

      const response = await fetch(url as string, {
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
      dedupingInterval: 10000, // dedupe requests within 10s
      keepPreviousData: true,
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )
}
