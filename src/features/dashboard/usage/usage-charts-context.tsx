'use client'

import { fillTimeSeriesWithEmptyPoints } from '@/lib/utils/time-series'
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
import { formatAxisDate } from './compute-usage-chart/utils'
import {
  INITIAL_TIMEFRAME_DATA_POINT_PREFIX_MS,
  INITIAL_TIMEFRAME_FALLBACK_RANGE_MS,
} from './constants'
import {
  calculateTotals,
  formatEmptyValues,
  formatHoveredValues,
  formatTotalValues,
} from './display-utils'
import {
  determineSamplingMode,
  getSamplingModeStepMs,
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

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

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

  const samplingModeStepMs = useMemo(
    () => getSamplingModeStepMs(samplingMode),
    [samplingMode]
  )

  const filteredSampledData = useMemo(
    () =>
      processUsageData(data.hour_usages, samplingMode).filter(
        (d) => d.timestamp >= timeframe.start && d.timestamp <= timeframe.end
      ),
    [data.hour_usages, samplingMode, timeframe]
  )

  const formatSeriesDataHelper = useCallback(
    (key: 'sandboxCount' | 'cost' | 'vcpuHours' | 'ramGibHours') => {
      return fillTimeSeriesWithEmptyPoints(
        filteredSampledData.map((d) => ({
          x: d.timestamp,
          y: d[key as keyof typeof d],
        })),
        {
          start: timeframe.start,
          end: timeframe.end,
          step: samplingModeStepMs,
        }
      )
    },
    [filteredSampledData, timeframe, samplingModeStepMs]
  )

  const seriesData = useMemo(() => {
    return {
      sandboxes: formatSeriesDataHelper('sandboxCount'),
      cost: formatSeriesDataHelper('cost'),
      vcpu: formatSeriesDataHelper('vcpuHours'),
      ram: formatSeriesDataHelper('ramGibHours'),
    }
  }, [formatSeriesDataHelper])

  const displayedData = useMemo<ComputeUsageSeriesData>(() => {
    return {
      sandboxes: seriesData.sandboxes.map((d) => ({
        x: formatAxisDate(d.x, samplingMode),
        y: d.y,
      })),
      cost: seriesData.cost.map((d) => ({
        x: formatAxisDate(d.x, samplingMode),
        y: d.y,
      })),
      vcpu: seriesData.vcpu.map((d) => ({
        x: formatAxisDate(d.x, samplingMode),
        y: d.y,
      })),
      ram: seriesData.ram.map((d) => ({
        x: formatAxisDate(d.x, samplingMode),
        y: d.y,
      })),
    }
  }, [seriesData, samplingMode])

  const totals = useMemo<MetricTotals>(
    () => calculateTotals(filteredSampledData),
    [filteredSampledData]
  )

  const displayValues = useMemo(() => {
    if (
      hoveredIndex !== null &&
      seriesData.sandboxes[hoveredIndex] !== undefined
    ) {
      return formatHoveredValues(
        seriesData.sandboxes[hoveredIndex].y,
        seriesData.cost[hoveredIndex]!.y,
        seriesData.vcpu[hoveredIndex]!.y,
        seriesData.ram[hoveredIndex]!.y,
        seriesData.sandboxes[hoveredIndex]!.x,
        samplingMode
      )
    }

    if (filteredSampledData.length === 0) {
      return formatEmptyValues()
    }

    return formatTotalValues(totals)
  }, [
    hoveredIndex,
    filteredSampledData.length,
    totals,
    seriesData.sandboxes,
    seriesData.cost,
    seriesData.vcpu,
    seriesData.ram,
    samplingMode,
  ])

  const setTimeframe = useCallback(
    (start: number, end: number) => {
      setParams({ start: start, end: end })
    },
    [setParams]
  )

  const onBrushEnd = useCallback(
    (startIndex: number, endIndex: number) => {
      setHoveredIndex(null)
      setTimeframe(
        seriesData.sandboxes[startIndex]!.x,
        seriesData.sandboxes[endIndex]!.x
      )
    },
    [seriesData.sandboxes, setTimeframe]
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
    }),
    [
      displayedData,
      timeframe,
      onBrushEnd,
      setTimeframe,
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
