'use client'

import { parseAsInteger, useQueryStates } from 'nuqs'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { UsageResponse } from '@/core/modules/billing/models'
import { useTimezone } from '@/features/dashboard/timezone'
import { fillTimeSeriesWithEmptyPoints } from '@/lib/utils/time-series'
import { INITIAL_TIMEFRAME_FALLBACK_RANGE_MS } from './constants'
import {
  calculateTotals,
  formatAxisDate,
  formatEmptyValues,
  formatHoveredValues,
  formatTotalValues,
} from './display-utils'
import {
  determineSamplingMode,
  normalizeToEndOfSamplingPeriod,
  processUsageData,
} from './sampling-utils'
import type {
  ComputeUsageSeriesData,
  DisplayValue,
  MetricTotals,
  SamplingMode,
  Timeframe,
} from './types'

interface UsageChartsContextValue {
  displayedData: ComputeUsageSeriesData
  timeframe: Timeframe
  setTimeframe: (start: number, end: number) => void
  setHoveredIndex: (index: number | null) => void
  onBrushEnd: (startIndex: number, endIndex: number) => void
  totals: MetricTotals
  samplingMode: SamplingMode
  displayValues: {
    sandboxes: DisplayValue
    cost: DisplayValue
    vcpu: DisplayValue
    ram: DisplayValue
  }
  fullscreenMetric: 'sandboxes' | 'cost' | 'vcpu' | 'ram' | null
  setFullscreenMetric: (
    metric: 'sandboxes' | 'cost' | 'vcpu' | 'ram' | null
  ) => void
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
  const { timezone } = useTimezone()
  // MUTABLE STATE

  const [params, setParams] = useQueryStates(timeframeParams, {
    history: 'push',
    shallow: true,
  })

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [fullscreenMetric, setFullscreenMetric] = useState<
    'sandboxes' | 'cost' | 'vcpu' | 'ram' | null
  >(null)

  // DERIVED STATE

  const defaultRange = useMemo(() => {
    const now = Date.now()
    return { start: now - INITIAL_TIMEFRAME_FALLBACK_RANGE_MS, end: now }
  }, [])

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

  // NOTE - this assumes that there would be either:
  // 1. a value in all metrics for the exact same hour
  // 2. no value in any metric for the exact same hour
  const zeroFilledTimeframeFilteredData = useMemo(() => {
    return fillTimeSeriesWithEmptyPoints<UsageResponse['hour_usages'][number]>(
      data.hour_usages,
      {
        start: timeframe.start,
        end: timeframe.end,
        step: 60 * 60 * 1000, // hourly
        timestampAccessorKey: 'timestamp',
        emptyPointGenerator: (timestamp: number) => ({
          timestamp,
          sandbox_count: 0,
          cpu_hours: 0,
          ram_gib_hours: 0,
          price_for_ram: 0,
          price_for_cpu: 0,
        }),
      }
    )
  }, [data.hour_usages, timeframe])

  const sampledData = useMemo(
    () =>
      processUsageData(zeroFilledTimeframeFilteredData, timeframe, timezone),
    [zeroFilledTimeframeFilteredData, timeframe, timezone]
  )

  const seriesData = useMemo(() => {
    return {
      sandboxes: sampledData.map((d) => ({
        x: d.timestamp,
        y: d.sandboxCount,
      })),
      cost: sampledData.map((d) => ({
        x: d.timestamp,
        y: d.cost,
      })),
      vcpu: sampledData.map((d) => ({
        x: d.timestamp,
        y: d.vcpuHours,
      })),
      ram: sampledData.map((d) => ({
        x: d.timestamp,
        y: d.ramGibHours,
      })),
    }
  }, [sampledData])

  const displayedData = useMemo<ComputeUsageSeriesData>(() => {
    return {
      sandboxes: seriesData.sandboxes.map((d) => ({
        x: formatAxisDate(d.x, samplingMode, timezone),
        y: d.y,
      })),
      cost: seriesData.cost.map((d) => ({
        x: formatAxisDate(d.x, samplingMode, timezone),
        y: d.y,
      })),
      vcpu: seriesData.vcpu.map((d) => ({
        x: formatAxisDate(d.x, samplingMode, timezone),
        y: d.y,
      })),
      ram: seriesData.ram.map((d) => ({
        x: formatAxisDate(d.x, samplingMode, timezone),
        y: d.y,
      })),
    }
  }, [seriesData, samplingMode, timezone])

  const totals = useMemo<MetricTotals>(
    () => calculateTotals(sampledData),
    [sampledData]
  )

  const displayValues = useMemo(() => {
    if (hoveredIndex !== null) {
      const sandboxPoint = seriesData.sandboxes[hoveredIndex]
      const costPoint = seriesData.cost[hoveredIndex]
      const vcpuPoint = seriesData.vcpu[hoveredIndex]
      const ramPoint = seriesData.ram[hoveredIndex]

      if (!sandboxPoint || !costPoint || !vcpuPoint || !ramPoint) {
        return formatTotalValues(totals)
      }

      return formatHoveredValues(
        sandboxPoint.y,
        costPoint.y,
        vcpuPoint.y,
        ramPoint.y,
        sandboxPoint.x,
        timeframe,
        timezone
      )
    }

    if (sampledData.length === 0) {
      return formatEmptyValues()
    }

    return formatTotalValues(totals)
  }, [
    hoveredIndex,
    sampledData.length,
    totals,
    seriesData.sandboxes,
    seriesData.cost,
    seriesData.vcpu,
    seriesData.ram,
    timeframe,
    timezone,
  ])

  const setTimeframe = useCallback(
    (start: number, end: number) => {
      setParams({ start: start, end: end })
    },
    [setParams]
  )

  const onBrushEnd = useCallback(
    (startIndex: number, endIndex: number) => {
      const startPoint = seriesData.sandboxes[startIndex]
      const endPoint = seriesData.sandboxes[endIndex]
      if (!startPoint || !endPoint) return

      setHoveredIndex(null)
      setTimeframe(
        startPoint.x,
        normalizeToEndOfSamplingPeriod(endPoint.x, samplingMode, timezone)
      )
    },
    [seriesData.sandboxes, setTimeframe, samplingMode, timezone]
  )

  const value = useMemo(
    () => ({
      displayedData,
      timeframe,
      setTimeframe,
      setHoveredIndex,
      onBrushEnd,
      totals,
      samplingMode,
      displayValues,
      fullscreenMetric,
      setFullscreenMetric,
    }),
    [
      displayedData,
      timeframe,
      onBrushEnd,
      setTimeframe,
      totals,
      samplingMode,
      displayValues,
      fullscreenMetric,
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
