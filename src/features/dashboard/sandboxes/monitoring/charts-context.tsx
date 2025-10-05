'use client'

import { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import useSWR from 'swr'
import { useTimeframe } from './hooks/use-timeframe'

interface TeamMetricsChartsContextValue
  extends ReturnType<typeof useTimeframe> {
  data: TeamMetricsResponse | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  isPolling: boolean
}

const TeamMetricsChartsContext = createContext<
  TeamMetricsChartsContextValue | undefined
>(undefined)

interface TeamMetricsChartsProviderProps {
  teamId: string
  initialData: TeamMetricsResponse
  children: ReactNode
}

export function TeamMetricsChartsProvider({
  teamId,
  initialData,
  children,
}: TeamMetricsChartsProviderProps) {
  const { timeframe, setTimeRange, setCustomRange } = useTimeframe()

  const { data, error, isLoading, isValidating } = useSWR<TeamMetricsResponse>(
    [`/api/teams/${teamId}/metrics`, timeframe.start, timeframe.end],
    async ([url, start, end]: [string, number, number]) => {
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
        throw new Error(errorData.error || 'Failed to fetch metrics')
      }

      return (await response.json()) as TeamMetricsResponse
    },
    {
      fallbackData: initialData,
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: true,
      revalidateOnMount: false,
      dedupingInterval: 500,
      errorRetryInterval: 5000,
      errorRetryCount: 3,
    }
  )

  const value = useMemo(
    () => ({
      data,
      error,
      isLoading,
      isValidating,
      isPolling: timeframe.isLive,
      timeframe,
      setTimeRange,
      setCustomRange,
    }),
    [
      data,
      error,
      isLoading,
      isValidating,
      timeframe,
      setTimeRange,
      setCustomRange,
    ]
  )

  return (
    <TeamMetricsChartsContext.Provider value={value}>
      {children}
    </TeamMetricsChartsContext.Provider>
  )
}

export function useTeamMetricsCharts() {
  const context = useContext(TeamMetricsChartsContext)

  if (context === undefined) {
    throw new Error(
      'useTeamMetricsCharts must be used within TeamMetricsChartsProvider'
    )
  }
  return context
}
