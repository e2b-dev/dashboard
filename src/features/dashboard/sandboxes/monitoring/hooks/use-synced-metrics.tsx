'use client'

import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { ParsedTimeframe } from '@/lib/utils/timeframe'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { NonUndefined } from 'react-hook-form'
import useSWR, { SWRConfiguration } from 'swr'

interface UseSyncedMetricsOptions {
  teamId: string
  timeframe: ParsedTimeframe
  initialData?: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
  pollingEnabled?: boolean
  swrOptions?: SWRConfiguration
}

/**
 * Unified hook for fetching team metrics with proper client-server synchronization
 * Handles both static and live (polling) modes based on timeframe
 */
export function useSyncedMetrics({
  teamId,
  timeframe,
  initialData,
  pollingEnabled = true,
  swrOptions = {},
}: UseSyncedMetricsOptions) {
  const shouldPoll = timeframe.isLive && pollingEnabled

  // create a stable key that includes all timeframe properties
  // this ensures SWR detects changes and refetches
  const swrKey = [
    `/api/teams/${teamId}/metrics`,
    teamId,
    Math.floor(timeframe.start), // floor to ensure consistent keys
    Math.floor(timeframe.end),
    timeframe.isLive,
  ]

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    async ([url, teamId, start, end]: [
      string,
      string,
      number,
      number,
      boolean,
    ]) => {
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

      return response.json()
    },
    {
      fallbackData: initialData,
      keepPreviousData: true,
      refreshInterval: shouldPoll ? TEAM_METRICS_POLLING_INTERVAL_MS : 0,
      revalidateOnFocus: shouldPoll,
      revalidateOnReconnect: shouldPoll,
      revalidateIfStale: true, // always revalidate stale data
      revalidateOnMount: true, // always fetch on mount
      errorRetryInterval: 5000,
      errorRetryCount: 3,
      ...swrOptions,
    }
  )

  return {
    data: data || initialData,
    error,
    isLoading: isLoading && !data,
    isValidating,
    mutate,
    isPolling: shouldPoll,
    timeframe,
  }
}
