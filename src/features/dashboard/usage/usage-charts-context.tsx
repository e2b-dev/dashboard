'use client'

import {
  formatDateRange,
  formatDay,
  formatNumber,
} from '@/lib/utils/formatting'
import {
  downsampleToWeekly,
  getWeekEndForWeekStart,
  getWeekStartForTimestamp,
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
  isDownsampled: boolean
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

  // Determine if we should downsample (3 months = ~90 days)
  const isDownsampled = useMemo(() => {
    const rangeDays = (timeframe.end - timeframe.start) / (24 * 60 * 60 * 1000)
    return rangeDays >= 90
  }, [timeframe])

  const filledSeries = useMemo<FilledSeriesData>(() => {
    const sandboxesSeries: TimeSeriesPoint[] = data.day_usages.map((d) => ({
      x: new Date(d.date).getTime(),
      y: d.sandbox_count,
    }))
    const costSeries: TimeSeriesPoint[] = data.day_usages.map((d) => ({
      x: new Date(d.date).getTime(),
      y: d.price_for_ram + d.price_for_cpu,
    }))
    const ramSeries: TimeSeriesPoint[] = data.day_usages.map((d) => ({
      x: new Date(d.date).getTime(),
      y: d.ram_gib_hours,
    }))
    const vcpuSeries: TimeSeriesPoint[] = data.day_usages.map((d) => ({
      x: new Date(d.date).getTime(),
      y: d.cpu_hours,
    }))

    // Apply weekly downsampling for ranges >= 3 months
    if (isDownsampled) {
      return {
        sandboxes: downsampleToWeekly(sandboxesSeries),
        cost: downsampleToWeekly(costSeries),
        vcpu: downsampleToWeekly(vcpuSeries),
        ram: downsampleToWeekly(ramSeries),
      }
    }

    return {
      sandboxes: sandboxesSeries,
      cost: costSeries,
      vcpu: vcpuSeries,
      ram: ramSeries,
    }
  }, [data, isDownsampled])

  const totals = useMemo<MetricTotals>(() => {
    const filterByTimeframe = (series: TimeSeriesPoint[]) =>
      series.filter((point) => {
        const timestamp =
          typeof point.x === 'number' ? point.x : new Date(point.x).getTime()
        return timestamp >= timeframe.start && timestamp <= timeframe.end
      })

    const sandboxesTotal = filterByTimeframe(filledSeries.sandboxes).reduce(
      (acc, item) => acc + item.y,
      0
    )
    const costTotal = filterByTimeframe(filledSeries.cost).reduce(
      (acc, item) => acc + item.y,
      0
    )
    const vcpuTotal = filterByTimeframe(filledSeries.vcpu).reduce(
      (acc, item) => acc + item.y,
      0
    )
    const ramTotal = filterByTimeframe(filledSeries.ram).reduce(
      (acc, item) => acc + item.y,
      0
    )

    return {
      sandboxes: sandboxesTotal,
      cost: costTotal,
      vcpu: vcpuTotal,
      ram: ramTotal,
    }
  }, [filledSeries, timeframe])

  const displayValues = useMemo(() => {
    // check if there's any data in the current timeframe
    const hasDataInRange = filledSeries.sandboxes.some((point) => {
      const timestamp =
        typeof point.x === 'number' ? point.x : new Date(point.x).getTime()
      return timestamp >= timeframe.start && timestamp <= timeframe.end
    })

    if (hoveredTimestamp) {
      if (isDownsampled) {
        // for downsampled data, find the week and aggregate all days in that week
        const weekStart = getWeekStartForTimestamp(hoveredTimestamp)
        const weekEnd = getWeekEndForWeekStart(weekStart)
        const timestampLabel = formatDateRange(weekStart, weekEnd)

        // aggregate all days within this week
        const weekUsages = data.day_usages.filter((d) => {
          const pointTime = new Date(d.date).getTime()
          return pointTime >= weekStart && pointTime <= weekEnd
        })

        if (weekUsages.length > 0) {
          const aggregatedSandboxes = weekUsages.reduce(
            (sum, d) => sum + d.sandbox_count,
            0
          )
          const aggregatedCost = weekUsages.reduce(
            (sum, d) => sum + d.price_for_ram + d.price_for_cpu,
            0
          )
          const aggregatedVcpu = weekUsages.reduce(
            (sum, d) => sum + d.cpu_hours,
            0
          )
          const aggregatedRam = weekUsages.reduce(
            (sum, d) => sum + d.ram_gib_hours,
            0
          )

          return {
            sandboxes: {
              displayValue: formatNumber(aggregatedSandboxes),
              label: 'week of',
              timestamp: timestampLabel,
            },
            cost: {
              displayValue: `$${aggregatedCost.toFixed(2)}`,
              label: 'week of',
              timestamp: timestampLabel,
            },
            vcpu: {
              displayValue: formatNumber(aggregatedVcpu),
              label: 'week of',
              timestamp: timestampLabel,
            },
            ram: {
              displayValue: formatNumber(aggregatedRam),
              label: 'week of',
              timestamp: timestampLabel,
            },
          }
        }
      } else {
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
    }

    // no data in selected range
    if (!hasDataInRange) {
      return {
        sandboxes: {
          displayValue: '0',
          label: 'no data in range',
          timestamp: null,
        },
        cost: {
          displayValue: '$0.00',
          label: 'no data in range',
          timestamp: null,
        },
        vcpu: {
          displayValue: '0',
          label: 'no data in range',
          timestamp: null,
        },
        ram: {
          displayValue: '0',
          label: 'no data in range',
          timestamp: null,
        },
      }
    }

    return {
      sandboxes: {
        displayValue: formatNumber(totals.sandboxes),
        label: 'total over range',
        timestamp: null,
      },
      cost: {
        displayValue: `$${totals.cost.toFixed(2)}`,
        label: 'total over range',
        timestamp: null,
      },
      vcpu: {
        displayValue: formatNumber(totals.vcpu),
        label: 'total over range',
        timestamp: null,
      },
      ram: {
        displayValue: formatNumber(totals.ram),
        label: 'total over range',
        timestamp: null,
      },
    }
  }, [hoveredTimestamp, data, totals, isDownsampled, filledSeries, timeframe])

  const value = useMemo(
    () => ({
      data,
      filledSeries,
      timeframe,
      setTimeframe,
      hoveredTimestamp,
      setHoveredTimestamp,
      totals,
      isDownsampled,
      displayValues,
    }),
    [
      data,
      filledSeries,
      timeframe,
      setTimeframe,
      hoveredTimestamp,
      totals,
      isDownsampled,
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
