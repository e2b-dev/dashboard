import type { Timezone } from '@/features/dashboard/timezone'
import {
  dateTimePartsToUtcTimestamp,
  formatAxisNumber,
  getDateParts,
  shiftCalendarDays,
} from '@/lib/utils/formatting'
import type { TimeRangePreset } from '@/ui/time-range-presets'
import type {
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

/**
 * How far a timeframe may deviate from a preset's boundaries and still be
 * treated as that preset. Shared between the time-range controls (preset
 * highlight) and the UTC pin (timeframe re-anchoring) — the two must not
 * drift, or a highlighted preset would fail to re-anchor.
 */
export const PRESET_MATCH_TOLERANCE_MS = 24 * 60 * 60 * 1000

type CalendarDateParts = ReturnType<typeof getDateParts>

const shiftToMonthStart = (
  parts: CalendarDateParts,
  monthOffset: number
): CalendarDateParts => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + monthOffset, 1))

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: 1,
  }
}

const getMonthEnd = (year: number, month: number): CalendarDateParts => {
  const date = new Date(Date.UTC(year, month, 0))

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

const getZonedDayBoundaryTimestamps = (
  startParts: CalendarDateParts,
  endParts: CalendarDateParts,
  timezone: Timezone
): { start: number; end: number } => ({
  start: dateTimePartsToUtcTimestamp(
    {
      ...startParts,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
    timezone
  ),
  end:
    dateTimePartsToUtcTimestamp(
      {
        ...endParts,
        hours: 23,
        minutes: 59,
        seconds: 59,
      },
      timezone
    ) + 999,
})

const getUsageTimeRangePresets = (timezone: Timezone): TimeRangePreset[] => [
  {
    id: 'last-7-days',
    label: 'Last 7 days',
    shortcut: '7D',
    getValue: () => {
      const today = getDateParts(new Date(), timezone)
      return getZonedDayBoundaryTimestamps(
        shiftCalendarDays(today, -6),
        today,
        timezone
      )
    },
  },
  {
    id: 'last-14-days',
    label: 'Last 14 days',
    shortcut: '14D',
    getValue: () => {
      const today = getDateParts(new Date(), timezone)
      return getZonedDayBoundaryTimestamps(
        shiftCalendarDays(today, -13),
        today,
        timezone
      )
    },
  },
  {
    id: 'last-30-days',
    label: 'Last 30 days',
    shortcut: '30D',
    getValue: () => {
      const today = getDateParts(new Date(), timezone)
      return getZonedDayBoundaryTimestamps(
        shiftCalendarDays(today, -29),
        today,
        timezone
      )
    },
  },
  {
    id: 'last-90-days',
    label: 'Last 90 days',
    shortcut: '90D',
    getValue: () => {
      const today = getDateParts(new Date(), timezone)
      return getZonedDayBoundaryTimestamps(
        shiftCalendarDays(today, -89),
        today,
        timezone
      )
    },
  },
  {
    id: 'this-month',
    label: 'This month',
    getValue: () => {
      const today = getDateParts(new Date(), timezone)
      const start = { year: today.year, month: today.month, day: 1 }
      return getZonedDayBoundaryTimestamps(
        start,
        getMonthEnd(today.year, today.month),
        timezone
      )
    },
  },
  {
    id: 'last-month',
    label: 'Last month',
    getValue: () => {
      const today = getDateParts(new Date(), timezone)
      const start = shiftToMonthStart(today, -1)
      return getZonedDayBoundaryTimestamps(
        start,
        getMonthEnd(start.year, start.month),
        timezone
      )
    },
  },
  {
    id: 'this-year',
    label: 'This year',
    getValue: () => {
      const today = getDateParts(new Date(), timezone)
      return getZonedDayBoundaryTimestamps(
        { year: today.year, month: 1, day: 1 },
        { year: today.year, month: 12, day: 31 },
        timezone
      )
    },
  },
  {
    id: 'last-year',
    label: 'Last year',
    getValue: () => {
      const today = getDateParts(new Date(), timezone)
      const year = today.year - 1
      return getZonedDayBoundaryTimestamps(
        { year, month: 1, day: 1 },
        { year, month: 12, day: 31 },
        timezone
      )
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

export { getUsageTimeRangePresets }
