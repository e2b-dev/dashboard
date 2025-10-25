'use client'

import { formatDay, formatNumber } from '@/lib/utils/formatting'
import {
  fillTimeSeriesWithEmptyPoints,
  TimeSeriesPoint,
} from '@/lib/utils/time-series'
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

interface Timeframe {
  start: number
  end: number
}

interface DisplayValue {
  displayValue: string
  label: string
  timestamp: string | null
}

interface MetricTotals {
  sandboxes: number
  cost: number
  vcpu: number
  ram: number
}

interface FilledSeriesData {
  sandboxes: TimeSeriesPoint[]
  cost: TimeSeriesPoint[]
  vcpu: TimeSeriesPoint[]
  ram: TimeSeriesPoint[]
}

interface UsageChartsContextValue {
  data: UsageResponse
  filledSeries: FilledSeriesData
  timeframe: Timeframe
  setTimeframe: (start: number, end: number) => void
  hoveredTimestamp: number | null
  setHoveredTimestamp: (timestamp: number | null) => void
  totals: MetricTotals
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
      const start = firstDate - 3 * 24 * 60 * 60 * 1000
      return { start, end: now }
    }

    return { start: now - 30 * 24 * 60 * 60 * 1000, end: now }
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

  const filledSeries = useMemo<FilledSeriesData>(() => {
    const filteredUsages = data.day_usages.filter((usage) => {
      const timestamp = new Date(usage.date).getTime()
      return timestamp >= timeframe.start && timestamp <= timeframe.end
    })

    const step = 24 * 60 * 60 * 1000
    const sandboxesSeries: TimeSeriesPoint[] = filteredUsages.map((d) => ({
      x: new Date(d.date).getTime(),
      y: d.sandbox_count,
    }))
    const costSeries: TimeSeriesPoint[] = filteredUsages.map((d) => ({
      x: new Date(d.date).getTime(),
      y: d.price_for_ram + d.price_for_cpu,
    }))
    const ramSeries: TimeSeriesPoint[] = filteredUsages.map((d) => ({
      x: new Date(d.date).getTime(),
      y: d.ram_gib_hours,
    }))
    const vcpuSeries: TimeSeriesPoint[] = filteredUsages.map((d) => ({
      x: new Date(d.date).getTime(),
      y: d.cpu_hours,
    }))

    const filledSandboxes = fillTimeSeriesWithEmptyPoints(sandboxesSeries, {
      start: timeframe.start,
      end: timeframe.end,
      step,
    })
    const filledCost = fillTimeSeriesWithEmptyPoints(costSeries, {
      start: timeframe.start,
      end: timeframe.end,
      step,
    })
    const filledRam = fillTimeSeriesWithEmptyPoints(ramSeries, {
      start: timeframe.start,
      end: timeframe.end,
      step,
    })
    const filledVcpu = fillTimeSeriesWithEmptyPoints(vcpuSeries, {
      start: timeframe.start,
      end: timeframe.end,
      step,
    })

    return {
      sandboxes: filledSandboxes,
      cost: filledCost,
      vcpu: filledVcpu,
      ram: filledRam,
    }
  }, [data, timeframe])

  const totals = useMemo<MetricTotals>(() => {
    const sandboxesTotal = filledSeries.sandboxes.reduce(
      (acc, item) => acc + item.y,
      0
    )
    const costTotal = filledSeries.cost.reduce((acc, item) => acc + item.y, 0)
    const vcpuTotal = filledSeries.vcpu.reduce((acc, item) => acc + item.y, 0)
    const ramTotal = filledSeries.ram.reduce((acc, item) => acc + item.y, 0)

    return {
      sandboxes: sandboxesTotal,
      cost: costTotal,
      vcpu: vcpuTotal,
      ram: ramTotal,
    }
  }, [filledSeries])

  const displayValues = useMemo(() => {
    if (hoveredTimestamp) {
      const timestampLabel = formatDay(hoveredTimestamp)

      const dayUsage = data.day_usages.find((d) => {
        const pointTime = new Date(d.date).getTime()
        return Math.abs(pointTime - hoveredTimestamp) < 12 * 60 * 60 * 1000
      })

      if (dayUsage) {
        return {
          sandboxes: {
            displayValue: formatNumber(dayUsage.sandbox_count),
            label: 'on',
            timestamp: timestampLabel,
          },
          cost: {
            displayValue: `$${(dayUsage.price_for_ram + dayUsage.price_for_cpu).toFixed(2)}`,
            label: 'on',
            timestamp: timestampLabel,
          },
          vcpu: {
            displayValue: formatNumber(dayUsage.cpu_hours),
            label: 'on',
            timestamp: timestampLabel,
          },
          ram: {
            displayValue: formatNumber(dayUsage.ram_gib_hours),
            label: 'on',
            timestamp: timestampLabel,
          },
        }
      }
    }

    return {
      sandboxes: {
        displayValue: formatNumber(totals.sandboxes),
        label: 'over range',
        timestamp: null,
      },
      cost: {
        displayValue: `$${totals.cost.toFixed(2)}`,
        label: 'over range',
        timestamp: null,
      },
      vcpu: {
        displayValue: formatNumber(totals.vcpu),
        label: 'over range',
        timestamp: null,
      },
      ram: {
        displayValue: formatNumber(totals.ram),
        label: 'over range',
        timestamp: null,
      },
    }
  }, [hoveredTimestamp, data, totals])

  const value = useMemo(
    () => ({
      data,
      filledSeries,
      timeframe,
      setTimeframe,
      hoveredTimestamp,
      setHoveredTimestamp,
      totals,
      displayValues,
    }),
    [
      data,
      filledSeries,
      timeframe,
      setTimeframe,
      hoveredTimestamp,
      totals,
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
