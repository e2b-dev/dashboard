'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { SWR_KEYS } from '@/configs/keys'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { NonUndefined } from 'react-hook-form'
import useSWR from 'swr'
import { LiveSandboxCounter } from './live-counter'

interface LiveSandboxCounterClientProps {
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
  className?: string
  polling?: boolean
}

export function LiveSandboxCounterClient({
  initialData,
  className,
  polling = true,
}: LiveSandboxCounterClientProps) {
  const selectedTeam = useSelectedTeam()

  // use shared key - will share cache with header metrics
  const swrKey = selectedTeam
    ? SWR_KEYS.TEAM_METRICS_RECENT(selectedTeam.id)
    : null

  const { data } = useSWR<typeof initialData | undefined>(
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

      const responseData = (await response.json()) as TeamMetricsResponse

      if (!responseData.metrics) {
        return
      }

      return responseData
    },
    {
      fallbackData: initialData,
      shouldRetryOnError: false,
      refreshInterval: polling ? TEAM_METRICS_POLLING_INTERVAL_MS : 0,
      dedupingInterval: 10000, // dedupe requests within 10s
      keepPreviousData: true,
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  const lastConcurrentSandboxes =
    data?.metrics?.[(data?.metrics?.length ?? 0) - 1]?.concurrentSandboxes ?? 0

  return (
    <LiveSandboxCounter count={lastConcurrentSandboxes} className={className} />
  )
}
