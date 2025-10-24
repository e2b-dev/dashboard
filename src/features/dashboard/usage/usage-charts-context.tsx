'use client'

import { UsageData } from '@/server/usage/types'
import { parseAsInteger, useQueryStates } from 'nuqs'
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'

interface Timeframe {
  start: number
  end: number
}

interface UsageChartsContextValue {
  data: UsageData
  visibleData: UsageData
  timeframe: Timeframe
  setTimeframe: (start: number, end: number) => void
  hoveredTimestamp: number | null
  setHoveredTimestamp: (timestamp: number | null) => void
}

const UsageChartsContext = createContext<UsageChartsContextValue | undefined>(
  undefined
)

interface UsageChartsProviderProps {
  data: UsageData
  children: ReactNode
}

const timeframeParams = {
  startTime: parseAsInteger,
  endTime: parseAsInteger,
}

export function UsageChartsProvider({
  data,
  children,
}: UsageChartsProviderProps) {
  const [params, setParams] = useQueryStates(timeframeParams, {
    history: 'push',
    shallow: true,
  })

  // Get default range from data
  const defaultRange = useMemo(() => {
    if (data.compute && data.compute.length > 0) {
      const firstDate = new Date(data.compute[0]!.date).getTime()
      const lastDate = new Date(data.compute[data.compute.length - 1]!.date).getTime()
      return { start: firstDate, end: lastDate }
    }
    // Default to last 30 days
    const now = Date.now()
    return { start: now - 30 * 24 * 60 * 60 * 1000, end: now }
  }, [data])

  const timeframe = useMemo(
    () => ({
      start: params.startTime ?? defaultRange.start,
      end: params.endTime ?? defaultRange.end,
    }),
    [params.startTime, params.endTime, defaultRange]
  )

  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null)

  const setTimeframe = useCallback(
    (start: number, end: number) => {
      setParams({ startTime: start, endTime: end })
    },
    [setParams]
  )

  // Filter data based on timeframe
  const visibleData = useMemo<UsageData>(() => {
    const filterByTimeframe = <T extends { date: Date }>(items: T[]): T[] => {
      return items.filter((item) => {
        const itemTime = item.date.getTime()
        return itemTime >= timeframe.start && itemTime <= timeframe.end
      })
    }

    return {
      sandboxes: filterByTimeframe(data.sandboxes),
      compute: filterByTimeframe(data.compute),
      credits: data.credits,
    }
  }, [data, timeframe])

  const value = useMemo(
    () => ({
      data,
      visibleData,
      timeframe,
      setTimeframe,
      hoveredTimestamp,
      setHoveredTimestamp,
    }),
    [data, visibleData, timeframe, setTimeframe, hoveredTimestamp]
  )

  return (
    <UsageChartsContext.Provider value={value}>
      {children}
    </UsageChartsContext.Provider>
  )
}

export function useUsageCharts() {
  const context = useContext(UsageChartsContext)

  if (context === undefined) {
    throw new Error(
      'useUsageCharts must be used within UsageChartsProvider'
    )
  }
  return context
}
