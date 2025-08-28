'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { fillTeamMetricsWithZeros } from '@/lib/utils/sandboxes'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { useMemo } from 'react'
import useSWR from 'swr'

type ExplicitTimeRange = {
  start: number
  end: number
}

type DynamicTimeRange = {
  realtimeSyncRange: number // milliseconds to subtract from Date.now()
}

export type TimeRangeParams = ExplicitTimeRange | DynamicTimeRange

function isExplicitTimeRange(
  params: TimeRangeParams
): params is ExplicitTimeRange {
  return 'start' in params && 'end' in params
}

function calculateTimeFromRange(range: number): { start: number; end: number } {
  const end = Date.now()
  const start = end - range

  return { start, end }
}

export default function useTeamMetricsSWR(
  initialData: ClientTeamMetrics,
  timeParams: TimeRangeParams
) {
  const selectedTeam = useSelectedTeam()

  const swrKey = useMemo(() => {
    const baseKey = [`/api/teams/${selectedTeam?.id}/metrics`, selectedTeam?.id]

    if (isExplicitTimeRange(timeParams)) {
      return [...baseKey, timeParams.start, timeParams.end]
    } else {
      return [...baseKey, timeParams.realtimeSyncRange]
    }
  }, [selectedTeam?.id, timeParams])

  return useSWR<typeof initialData>(
    swrKey,
    async ([url, teamId]) => {
      if (!url || !teamId) return []

      const isExplicit = isExplicitTimeRange(timeParams)

      const currentTimeRange = isExplicit
        ? { start: timeParams.start, end: timeParams.end }
        : calculateTimeFromRange(timeParams.realtimeSyncRange)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentTimeRange),
        cache: 'no-store',
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to fetch metrics')
      }

      const data = (await response.json()) as TeamMetricsResponse

      if (!data.metrics) {
        return []
      }

      return fillTeamMetricsWithZeros(
        data.metrics,
        currentTimeRange.start,
        currentTimeRange.end
      )
    },
    {
      fallbackData: initialData,
      shouldRetryOnError: false,
      refreshInterval: TEAM_METRICS_POLLING_INTERVAL_MS,
      keepPreviousData: true,
      revalidateOnMount: false,
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )
}
