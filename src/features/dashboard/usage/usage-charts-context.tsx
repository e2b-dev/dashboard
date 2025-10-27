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
  formatEmptyValues,
  formatHoveredValues,
  formatTotalValues,
} from './display-utils'
import {
  calculateTotals,
  determineSamplingMode,
  findHoveredDataPoint,
  processUsageData,
} from './sampling-utils'
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
  const [params, setParams] = useQueryStates(timeframeParams, {
    history: 'push',
    shallow: true,
  })

  const defaultRange = useMemo(() => {
    const now = Date.now()

    if (data.day_usages && data.day_usages.length > 0) {
      const firstDate = new Date(data.day_usages[0]!.date).getTime()
      const start = firstDate - 3 * 24 * 60 * 60 * 1000 // - 3 days from first data point
      return { start, end: now }
    }

    return { start: now - 30 * 24 * 60 * 60 * 1000, end: now } // 30 days fallback
  }, [data])

  const timeframe = useMemo(
    () => ({
      start: params.start ?? defaultRange.start,
      end: params.end ?? defaultRange.end,
    }),
    [params.start, params.end, defaultRange]
  )

  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null)

  const setTimeframe = useCallback(
    (start: number, end: number) => {
      setParams({ start: start, end: end })
    },
    [setParams]
  )

  // determine sampling mode based on timeframe duration
  const samplingMode = useMemo(
    () => determineSamplingMode(timeframe),
    [timeframe]
  )

  const sampledData = useMemo(
    () => processUsageData(data.day_usages, timeframe, samplingMode),
    [data.day_usages, timeframe, samplingMode]
  )

  // convert sampled data to time series format for charts
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

  // calculate totals from sampled data (guarantees consistency with charts)
  const totals = useMemo<MetricTotals>(
    () => calculateTotals(sampledData),
    [sampledData]
  )

  const displayValues = useMemo(() => {
    // case 1: hovering - always show hover state (with data or zeros)
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

    // case 2: no data in range
    if (sampledData.length === 0) {
      return formatEmptyValues()
    }

    // case 3: default (show totals)
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
