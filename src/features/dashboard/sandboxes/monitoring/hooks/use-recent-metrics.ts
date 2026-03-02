'use client'

import { usePathname } from 'next/navigation'
import { parseAsInteger, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import useSWR from 'swr'
import type { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { SWR_KEYS } from '@/configs/keys'
import { useDashboard } from '@/features/dashboard/context'
import { calculateIsLive } from '../utils'

interface UseRecentMetricsOptions {
  /**
   * Initial data for SSR/hydration
   */
  initialData?: TeamMetricsResponse | undefined
}

/**
 * Shared hook for fetching recent team metrics (last 60 seconds).
 *
 * On /sandboxes pages with timeframe params, syncs with timeframe changes
 * by including start/end in the SWR key (triggers refetch when timeframe updates).
 *
 * On other pages, uses independent polling interval.
 *
 * Automatically pauses when tab is hidden using Page Visibility API.
 *
 * @param options - Configuration options
 * @returns SWR response with recent metrics data
 */
export function useRecentMetrics({
  initialData,
}: UseRecentMetricsOptions = {}) {
  const { team } = useDashboard()
  const pathname = usePathname()

  const [timeframeParams] = useQueryStates(
    {
      start: parseAsInteger,
      end: parseAsInteger,
    },
    { shallow: true }
  )

  const isOnSandboxesPage = pathname?.includes('/sandboxes') ?? false
  const hasTimeframeParams =
    timeframeParams.start !== null && timeframeParams.end !== null

  const shouldSyncWithTimeframe = useMemo(
    () =>
      isOnSandboxesPage &&
      hasTimeframeParams &&
      calculateIsLive(timeframeParams.start, timeframeParams.end),
    [
      isOnSandboxesPage,
      hasTimeframeParams,
      timeframeParams.start,
      timeframeParams.end,
    ]
  )

  const swrKey: readonly [string | null, string | null, ...unknown[]] = team
    ? shouldSyncWithTimeframe
      ? [
          ...SWR_KEYS.TEAM_METRICS_RECENT(team.id),
          timeframeParams.start,
          timeframeParams.end,
        ]
      : SWR_KEYS.TEAM_METRICS_RECENT(team.id)
    : [null, null]

  return useSWR<TeamMetricsResponse | undefined>(
    swrKey,
    async ([url, teamId]: typeof swrKey) => {
      if (!url || !teamId) return

      const fetchEnd = Date.now()
      const fetchStart = fetchEnd - 60_000

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

      return (await response.json()) as TeamMetricsResponse
    },
    {
      fallbackData: initialData,
      shouldRetryOnError: false,
      // disable polling when syncing with timeframe (key changes trigger refetch)
      // enable polling on other pages
      refreshInterval: shouldSyncWithTimeframe
        ? 0
        : TEAM_METRICS_POLLING_INTERVAL_MS,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      keepPreviousData: true,
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )
}
