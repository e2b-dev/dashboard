import { formatAxisNumber } from '@/lib/utils/formatting'
import { TimeRangePreset } from '@/ui/time-range-presets'
import {
  ComputeChartConfig,
  ComputeChartType,
} from './compute-usage-chart/types'

/**
 * Default fallback range in milliseconds (30 days)
 * Used when no data is available to determine the appropriate range
 */
export const INITIAL_TIMEFRAME_FALLBACK_RANGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Threshold in days for switching between sampling modes
 */
export const HOURLY_SAMPLING_THRESHOLD_DAYS = 3
export const WEEKLY_SAMPLING_THRESHOLD_DAYS = 60

export const TIME_RANGE_PRESETS: TimeRangePreset[] = [
  {
    id: 'last-7-days',
    label: 'Last 7 days',
    shortcut: '7D',
    getValue: () => {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-14-days',
    label: 'Last 14 days',
    shortcut: '14D',
    getValue: () => {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setDate(start.getDate() - 13)
      start.setHours(0, 0, 0, 0)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-30-days',
    label: 'Last 30 days',
    shortcut: '30D',
    getValue: () => {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setDate(start.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-90-days',
    label: 'Last 90 days',
    shortcut: '90D',
    getValue: () => {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setDate(start.getDate() - 89)
      start.setHours(0, 0, 0, 0)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'this-month',
    label: 'This month',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-month',
    label: 'Last month',
    getValue: () => {
      const now = new Date()
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
        0,
        0,
        0,
        0
      )
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      )
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'this-year',
    label: 'This year',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-year',
    label: 'Last year',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
]

export const COMPUTE_CHART_CONFIGS: Record<
  ComputeChartType,
  ComputeChartConfig
> = {
  sandboxes: {
    id: 'sandboxes-usage',
    name: 'Sandboxes',
    valueKey: 'count',
    barColorVar: '--accent-main-highlight',
    yAxisScaleFactor: 1.8,
    yAxisFormatter: formatAxisNumber,
  },
  cost: {
    id: 'cost-usage',
    name: 'Cost',
    valueKey: 'total_cost',
    barColorVar: '--accent-positive-highlight',
    yAxisScaleFactor: 1.8,
    yAxisFormatter: (value: number) => `$${formatAxisNumber(value)}`,
  },
  ram: {
    id: 'ram-usage',
    name: 'RAM Hours',
    valueKey: 'ram_gb_hours',
    barColorVar: '--bg-inverted',
    yAxisScaleFactor: 1.8,
    yAxisFormatter: formatAxisNumber,
  },
  vcpu: {
    id: 'vcpu-usage',
    name: 'vCPU Hours',
    valueKey: 'vcpu_hours',
    barColorVar: '--bg-inverted',
    yAxisScaleFactor: 1.8,
    yAxisFormatter: formatAxisNumber,
  },
}
