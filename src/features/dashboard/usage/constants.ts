import {
  type Timezone,
  zonedDateTimePartsToUtcTimestamp,
} from '@/features/dashboard/timezone'
import { formatAxisNumber } from '@/lib/utils/formatting'
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

interface CalendarDateParts {
  year: number
  month: number
  day: number
}

const getZonedDateParts = (
  value: Date,
  timezone: Timezone
): CalendarDateParts => {
  const [yearPart, monthPart, dayPart] = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(value)
    .split('-')

  const year = Number.parseInt(yearPart ?? '', 10)
  const month = Number.parseInt(monthPart ?? '', 10)
  const day = Number.parseInt(dayPart ?? '', 10)

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error('Unable to format usage preset date')
  }

  return { year, month, day }
}

// Shifts a calendar date without applying local timezone rules; e.g. 2026-06-10 + -89 -> 2026-03-13.
const shiftCalendarDays = (
  parts: CalendarDateParts,
  days: number
): CalendarDateParts => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  date.setUTCDate(date.getUTCDate() + days)

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

// Shifts to the first day of another calendar month; e.g. 2026-06-10 + -1 -> 2026-05-01.
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

// Returns the last calendar date in a month; e.g. 2026-02 -> 2026-02-28.
const getMonthEnd = (year: number, month: number): CalendarDateParts => {
  const date = new Date(Date.UTC(year, month, 0))

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

// Converts selected-zone day boundaries to UTC milliseconds; e.g. 2026-06-10 in America/New_York -> 04:00Z to 03:59:59.999Z.
const getZonedDayBoundaryTimestamps = (
  startParts: CalendarDateParts,
  endParts: CalendarDateParts,
  timezone: Timezone
): { start: number; end: number } => ({
  start: zonedDateTimePartsToUtcTimestamp(
    {
      ...startParts,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
    timezone
  ),
  end:
    zonedDateTimePartsToUtcTimestamp(
      {
        ...endParts,
        hours: 23,
        minutes: 59,
        seconds: 59,
      },
      timezone
    ) + 999,
})

// Returns usage presets bound to selected-zone calendar days; e.g. Last 7 days in America/New_York starts at New York midnight.
const getUsageTimeRangePresets = (timezone: Timezone): TimeRangePreset[] => [
  {
    id: 'last-7-days',
    label: 'Last 7 days',
    shortcut: '7D',
    getValue: () => {
      const today = getZonedDateParts(new Date(), timezone)
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
      const today = getZonedDateParts(new Date(), timezone)
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
      const today = getZonedDateParts(new Date(), timezone)
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
      const today = getZonedDateParts(new Date(), timezone)
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
      const today = getZonedDateParts(new Date(), timezone)
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
      const today = getZonedDateParts(new Date(), timezone)
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
      const today = getZonedDateParts(new Date(), timezone)
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
      const today = getZonedDateParts(new Date(), timezone)
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
