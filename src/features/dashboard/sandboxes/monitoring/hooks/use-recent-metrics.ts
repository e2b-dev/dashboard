'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { parseAsInteger, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import type { TeamMetricsResponse } from '@/core/modules/sandboxes/models.client'
import { useDashboard } from '@/features/dashboard/context'
import { useTRPCClient } from '@/trpc/client'
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
  const trpcClient = useTRPCClient()
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

  return useQuery<TeamMetricsResponse | undefined>({
    queryKey: [
      'sandboxes.getTeamMetrics.recent',
      team.slug,
      shouldSyncWithTimeframe ? timeframeParams.start : null,
      shouldSyncWithTimeframe ? timeframeParams.end : null,
    ],
    queryFn: () => {
      const fetchEnd = Date.now()
      const fetchStart = fetchEnd - 60_000

      return trpcClient.sandboxes.getTeamMetrics.query({
        teamSlug: team.slug,
        startDate: fetchStart,
        endDate: fetchEnd,
      })
    },
    initialData,
    retry: false,
    refetchInterval: shouldSyncWithTimeframe
      ? false
      : TEAM_METRICS_POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
