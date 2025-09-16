'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { ParsedTimeframe } from '@/lib/utils/timeframe'
import { toast } from 'sonner'
import useSWR, { SWRConfiguration } from 'swr'
import { fillTeamMetricsWithZeros } from '../utils'

interface UseSyncedMetricsOptions {
  teamId: string
  timeframe: ParsedTimeframe
  initialData?: TeamMetricsResponse
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

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<TeamMetricsResponse>(
      swrKey,
      async ([url, teamId, start, end, isLive]: [
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
          const errorData = await response.json()

          if (response.status === 400) {
            toast.error(
              'These timestamps seem wrong. Please check your input values.'
            )
          }

          throw new Error(errorData.error || 'Failed to fetch metrics')
        }

        const result = (await response.json()) as TeamMetricsResponse

        const filledMetrics = fillTeamMetricsWithZeros(
          result.metrics,
          start,
          end,
          result.step
        )

        return {
          ...result,
          metrics: filledMetrics,
        }
      },
      {
        fallbackData: initialData,
        keepPreviousData: true,
        refreshInterval: shouldPoll ? TEAM_METRICS_POLLING_INTERVAL_MS : 0,
        revalidateOnFocus: shouldPoll,
        revalidateOnReconnect: shouldPoll,
        revalidateIfStale: true, // always revalidate stale data
        revalidateOnMount: true, // always fetch fresh data on mount
        dedupingInterval: 0, // disable deduping to ensure fresh fetches when key changes
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
