import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { Timezone } from './schema'

interface ZonedDateTimeParts {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
}

interface ZonedDateRangeFormatOptions {
  includeTime?: boolean
  includeTimezone?: boolean
}

const pad = (value: number): string => String(value).padStart(2, '0')

// Formats a timestamp for picker inputs; e.g. 2026-06-08T13:05:09Z in America/New_York -> { date: "2026/06/08", time: "09:05:09" }.
const formatZonedDateTimeInput = (
  value: string | number | Date,
  timezone: Timezone
): { date: string; time: string } => ({
  date: formatInTimeZone(value, timezone, 'yyyy/MM/dd'),
  time: formatInTimeZone(value, timezone, 'HH:mm:ss'),
})

// Converts timezone wall-clock parts to UTC; e.g. 2026-06-08 09:00:00 in America/New_York -> 2026-06-08T13:00:00.000Z.
const zonedDateTimePartsToUtcDate = (
  parts: ZonedDateTimeParts,
  timezone: Timezone
): Date => {
  const wallClockValue = `${parts.year}-${pad(parts.month)}-${pad(
    parts.day
  )}T${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`

  return fromZonedTime(wallClockValue, timezone)
}

// Converts timezone wall-clock parts to a UTC timestamp; e.g. 2026-06-08 09:00:00 in America/New_York -> 1780923600000.
const zonedDateTimePartsToUtcTimestamp = (
  parts: ZonedDateTimeParts,
  timezone: Timezone
): number => zonedDateTimePartsToUtcDate(parts, timezone).getTime()

// Formats the short timezone abbreviation; e.g. 2026-06-08T13:00:00Z in America/New_York -> "EDT".
const formatTimezoneAbbreviation = (
  value: string | number | Date,
  timezone: Timezone
): string => {
  const abbreviation = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  })
    .formatToParts(new Date(value))
    .find((part) => part.type === 'timeZoneName')?.value

  return abbreviation ?? timezone
}

// Formats a compact timezone-aware date range; e.g. UTC start/end in America/New_York -> "Jun 8, 2026 - Jun 9, 2026, EDT".
const formatZonedDateRange = (
  start: string | number | Date,
  end: string | number | Date,
  timezone: Timezone,
  {
    includeTime = false,
    includeTimezone = true,
  }: ZonedDateRangeFormatOptions = {}
): string => {
  const baseOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }

  if (includeTime) {
    baseOptions.hour = '2-digit'
    baseOptions.minute = '2-digit'
    baseOptions.second = '2-digit'
  }

  const endOptions: Intl.DateTimeFormatOptions = {
    ...baseOptions,
    timeZoneName: includeTimezone ? 'short' : undefined,
  }

  const startFormatter = new Intl.DateTimeFormat('en-US', baseOptions)
  const endFormatter = new Intl.DateTimeFormat('en-US', endOptions)

  return `${startFormatter.format(new Date(start))} - ${endFormatter.format(
    new Date(end)
  )}`
}

// Formats a compact chart/tooltip timestamp; e.g. 2026-06-08T13:00:00Z in America/New_York -> "Jun 8, 9:00:00 AM EDT".
const formatZonedCompactDate = (
  timestamp: number,
  timezone: Timezone
): string => {
  const timestampYear = formatInTimeZone(timestamp, timezone, 'yyyy')
  const currentYear = formatInTimeZone(Date.now(), timezone, 'yyyy')

  if (timestampYear === currentYear) {
    return formatInTimeZone(timestamp, timezone, 'MMM d, h:mm:ss a zzz')
  }

  return formatInTimeZone(timestamp, timezone, 'yyyy MMM d, h:mm:ss a zzz')
}

// Formats a chart x-axis time label; e.g. 2026-06-08T13:05:09Z in America/New_York -> "09:05" or "09:05:09".
const formatZonedTimeAxisLabel = (
  timestamp: number,
  timezone: Timezone,
  includeSeconds = false
): string => {
  if (Number.isNaN(timestamp)) return ''

  return formatInTimeZone(
    timestamp,
    timezone,
    includeSeconds ? 'HH:mm:ss' : 'HH:mm'
  )
}

// Picks an ECharts-style time axis label format based on visible range duration.
const createZonedTimeAxisLabelFormatter = (
  timezone: Timezone,
  rangeMs: number
): ((value: number) => string) => {
  const format =
    rangeMs > 365 * 24 * 60 * 60 * 1000
      ? 'yyyy'
      : rangeMs > 2 * 24 * 60 * 60 * 1000
        ? 'MMM d'
        : 'HH:mm'

  return (value: number) => formatInTimeZone(value, timezone, format)
}

// Formats a relative day prefix and time in the selected timezone; e.g. today in America/New_York -> { prefix: "Today", time: "9:00:00 AM" }.
const formatZonedRelativeDayTime = (
  value: string | number | Date,
  timezone: Timezone
): { prefix: string; time: string } => {
  const valueKey = formatInTimeZone(value, timezone, 'yyyy-MM-dd')
  const todayKey = formatInTimeZone(Date.now(), timezone, 'yyyy-MM-dd')
  const yesterdayKey = formatInTimeZone(
    Date.now() - 24 * 60 * 60 * 1000,
    timezone,
    'yyyy-MM-dd'
  )

  let prefix: string
  if (valueKey === todayKey) prefix = 'Today'
  else if (valueKey === yesterdayKey) prefix = 'Yesterday'
  else prefix = formatInTimeZone(value, timezone, 'PP')

  return {
    prefix,
    time: formatInTimeZone(value, timezone, 'h:mm:ss a'),
  }
}

export {
  createZonedTimeAxisLabelFormatter,
  formatTimezoneAbbreviation,
  formatZonedCompactDate,
  formatZonedDateRange,
  formatZonedDateTimeInput,
  formatZonedRelativeDayTime,
  formatZonedTimeAxisLabel,
  zonedDateTimePartsToUtcDate,
  zonedDateTimePartsToUtcTimestamp,
}
export type { ZonedDateRangeFormatOptions, ZonedDateTimeParts }
