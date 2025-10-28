'use client'

import { UsageResponse } from '@/types/billing'
import { parseAsInteger, useQueryStates } from 'nuqs'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  INITIAL_TIMEFRAME_DATA_POINT_PREFIX_MS,
  INITIAL_TIMEFRAME_FALLBACK_RANGE_MS,
} from './constants'
import {
  calculateTotals,
  findHoveredDataPoint,
  formatEmptyValues,
  formatHoveredValues,
  formatTotalValues,
} from './display-utils'
import { determineSamplingMode, processUsageData } from './sampling-utils'
import {
  ComputeUsageSeriesData,
  DisplayValue,
  MetricTotals,
  SamplingMode,
  Timeframe,
} from './types'

interface UsageChartsContextValue {
  seriesData: ComputeUsageSeriesData
  timeframe: Timeframe
  setTimeframe: (start: number, end: number) => void
  hoveredTimestamp: number | null
  setHoveredTimestamp: (timestamp: number | null) => void
  totals: MetricTotals
  samplingMode: SamplingMode
  displayValues: {
    sandboxes: DisplayValue
    cost: DisplayValue
    vcpu: DisplayValue
    ram: DisplayValue
  }
}

const UsageChartsContext = createContext<UsageChartsContextValue | undefined>(
  undefined
)

interface UsageChartsProviderProps {
  data: UsageResponse
  children: ReactNode
}

const timeframeParams = {
  start: parseAsInteger,
  end: parseAsInteger,
}

export function UsageChartsProvider({
  data,
  children,
}: UsageChartsProviderProps) {
  // MUTABLE STATE

  const [params, setParams] = useQueryStates(timeframeParams, {
    history: 'push',
    shallow: true,
  })

  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null)

  const setTimeframe = useCallback(
    (start: number, end: number) => {
      setParams({ start: start, end: end })
    },
    [setParams]
  )

  // DERIVED STATE

  const defaultRange = useMemo(() => {
    const now = Date.now()

    if (data.hour_usages && data.hour_usages.length > 0) {
      const firstTimestamp = data.hour_usages[0]!.timestamp
      const start = firstTimestamp - INITIAL_TIMEFRAME_DATA_POINT_PREFIX_MS
      return { start, end: now }
    }

    return { start: now - INITIAL_TIMEFRAME_FALLBACK_RANGE_MS, end: now }
  }, [data])

  const timeframe = useMemo(
    () => ({
      start: params.start ?? defaultRange.start,
      end: params.end ?? defaultRange.end,
    }),
    [params.start, params.end, defaultRange]
  )

  const samplingMode = useMemo(
    () => determineSamplingMode(timeframe),
    [timeframe]
  )

  const sampledData = useMemo(
    () => processUsageData(data.hour_usages, samplingMode),
    [data.hour_usages, samplingMode]
  )

  const seriesData = useMemo<ComputeUsageSeriesData>(() => {
    return {
      sandboxes: sampledData.map((d) => ({
        x: d.timestamp,
        y: d.sandboxCount,
      })),
      cost: sampledData.map((d) => ({ x: d.timestamp, y: d.cost })),
      vcpu: sampledData.map((d) => ({ x: d.timestamp, y: d.vcpuHours })),
      ram: sampledData.map((d) => ({ x: d.timestamp, y: d.ramGibHours })),
    }
  }, [sampledData])

  const totals = useMemo<MetricTotals>(
    () => calculateTotals(sampledData),
    [sampledData]
  )

  const displayValues = useMemo(() => {
    if (hoveredTimestamp) {
      const hoveredPoint = findHoveredDataPoint(
        sampledData,
        hoveredTimestamp,
        samplingMode
      )

      return formatHoveredValues(
        hoveredPoint.sandboxCount,
        hoveredPoint.cost,
        hoveredPoint.vcpuHours,
        hoveredPoint.ramGibHours,
        hoveredPoint.timestamp,
        samplingMode
      )
    }

    if (sampledData.length === 0) {
      return formatEmptyValues()
    }

    return formatTotalValues(totals)
  }, [hoveredTimestamp, sampledData, samplingMode, totals])

  const value = useMemo(
    () => ({
      seriesData,
      timeframe,
      setTimeframe,
      hoveredTimestamp,
      setHoveredTimestamp,
      totals,
      samplingMode,
      displayValues,
    }),
    [
      seriesData,
      timeframe,
      setTimeframe,
      hoveredTimestamp,
      totals,
      samplingMode,
      displayValues,
    ]
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
    throw new Error('useUsageCharts must be used within UsageChartsProvider')
  }
  return context
}
