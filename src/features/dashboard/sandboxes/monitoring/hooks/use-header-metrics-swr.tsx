'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { SWR_KEYS } from '@/configs/keys'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { NonUndefined } from 'react-hook-form'
import useSWR from 'swr'

/**
 * SWR hook for fetching and caching team header metrics for the last 60 seconds.
 * Always fetches the most recent 60s window, regardless of selected time range.
 *
 * @param initialData - Initial metrics data for hydration (from server or SSR)
 * @returns SWR response object with latest team metrics data
 */
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

  const swr = useSWR<typeof initialData | undefined>(
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

      return (await response.json()) as TeamMetricsResponse
    },
    {
      fallbackData: initialData,
      shouldRetryOnError: false,
      refreshInterval: TEAM_METRICS_POLLING_INTERVAL_MS,
      keepPreviousData: false,
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  return swr
}
