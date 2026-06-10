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

export {
  formatTimezoneAbbreviation,
  formatZonedDateRange,
  formatZonedDateTimeInput,
  zonedDateTimePartsToUtcDate,
  zonedDateTimePartsToUtcTimestamp,
}
export type { ZonedDateRangeFormatOptions, ZonedDateTimeParts }
