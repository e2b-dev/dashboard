'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { TeamMetricsResponse } from '@/core/modules/sandboxes/models.client'
import { useTRPC } from '@/trpc/client'
import { useDashboard } from '../../context'
import { useTimeframe } from './hooks/use-timeframe'

interface HoveredChartValue {
  timestamp: number
  concurrentSandboxes?: number
  sandboxStartRate?: number
}

interface TeamMetricsChartsContextValue
  extends ReturnType<typeof useTimeframe> {
  data: TeamMetricsResponse | undefined
  error: unknown
  isLoading: boolean
  isValidating: boolean
  isPolling: boolean
  hoveredValue: HoveredChartValue | null
  setHoveredValue: (value: HoveredChartValue | null) => void
}

const TeamMetricsChartsContext = createContext<
  TeamMetricsChartsContextValue | undefined
>(undefined)

interface TeamMetricsChartsProviderProps {
  initialData?: TeamMetricsResponse
  children: ReactNode
}

export function TeamMetricsChartsProvider({
  initialData,
  children,
}: TeamMetricsChartsProviderProps) {
  const { team } = useDashboard()
  const trpc = useTRPC()
  const { timeframe, setTimeRange, setCustomRange } = useTimeframe()
  const [hoveredValue, setHoveredValue] = useState<HoveredChartValue | null>(
    null
  )

  const {
    data,
    error,
    isLoading,
    isFetching: isValidating,
  } = useQuery(
    trpc.sandboxes.getTeamMetrics.queryOptions(
      {
        teamSlug: team.slug,
        startDate: timeframe.start,
        endDate: timeframe.end,
      },
      {
        initialData,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 3,
        retryDelay: 5000,
      }
    )
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
      hoveredValue,
      setHoveredValue,
    }),
    [
      data,
      error,
      isLoading,
      isValidating,
      timeframe,
      setTimeRange,
      setCustomRange,
      hoveredValue,
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
