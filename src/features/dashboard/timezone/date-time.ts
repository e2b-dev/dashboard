import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { Timezone } from './schema'

interface ZonedDateParts {
  year: number
  month: number
  day: number
}

interface ZonedDateTimeParts extends ZonedDateParts {
  hours: number
  minutes: number
  seconds: number
}

const parseZonedFormatParts = (
  parts: Intl.DateTimeFormatPart[],
  fields: readonly Intl.DateTimeFormatPartTypes[]
): Record<string, string> =>
  parts.reduce<Record<string, string>>((result, part) => {
    if (fields.includes(part.type)) {
      result[part.type] = part.value
    }

    return result
  }, {})

const parseRequiredInt = (
  value: string | undefined,
  fieldName: string
): number => {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`Unable to parse zoned ${fieldName}`)
  }

  return parsed
}

const getZonedDateParts = (
  value: string | number | Date,
  timezone: Timezone
): ZonedDateParts => {
  const parts = parseZonedFormatParts(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(value)),
    ['year', 'month', 'day']
  )

  return {
    year: parseRequiredInt(parts.year, 'year'),
    month: parseRequiredInt(parts.month, 'month'),
    day: parseRequiredInt(parts.day, 'day'),
  }
}

const getZonedDateTimeParts = (
  value: string | number | Date,
  timezone: Timezone
): ZonedDateTimeParts => {
  const parts = parseZonedFormatParts(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(value)),
    ['year', 'month', 'day', 'hour', 'minute', 'second']
  )

  return {
    year: parseRequiredInt(parts.year, 'year'),
    month: parseRequiredInt(parts.month, 'month'),
    day: parseRequiredInt(parts.day, 'day'),
    hours: parseRequiredInt(parts.hour, 'hour'),
    minutes: parseRequiredInt(parts.minute, 'minute'),
    seconds: parseRequiredInt(parts.second, 'second'),
  }
}

// Shifts a calendar date without applying local timezone rules; e.g. 2026-06-10 + -89 -> 2026-03-13.
const shiftCalendarDays = (
  parts: ZonedDateParts,
  days: number
): ZonedDateParts => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  date.setUTCDate(date.getUTCDate() + days)

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

interface ZonedDateRangeFormatOptions {
  includeTime?: boolean
  includeTimezone?: boolean
}

const pad = (value: number): string => String(value).padStart(2, '0')

const formatZonedDateTimeInput = (
  value: string | number | Date,
  timezone: Timezone
): { date: string; time: string } => ({
  date: formatInTimeZone(value, timezone, 'yyyy/MM/dd'),
  time: formatInTimeZone(value, timezone, 'HH:mm:ss'),
})

const zonedInstantToCalendarDate = (
  value: string | number | Date,
  timezone: Timezone
): Date => {
  const { date } = formatZonedDateTimeInput(value, timezone)
  const [year = 0, month = 0, day = 0] = date.split('/').map(Number)

  return new Date(year, month - 1, day)
}

// Converts timezone wall-clock parts to UTC; e.g. 2026-06-08 09:00:00 in America/New_York -> 2026-06-08T13:00:00.000Z.
// DST gaps/overlaps are resolved by date-fns-tz consistently instead of rejected.
const zonedDateTimePartsToUtcDate = (
  parts: ZonedDateTimeParts,
  timezone: Timezone
): Date => {
  const wallClockValue = `${parts.year}-${pad(parts.month)}-${pad(
    parts.day
  )}T${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`

  return fromZonedTime(wallClockValue, timezone)
}

const zonedDateTimePartsToUtcTimestamp = (
  parts: ZonedDateTimeParts,
  timezone: Timezone
): number => zonedDateTimePartsToUtcDate(parts, timezone).getTime()

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

// Static date-fns format strings for known display presets.
const DATE_FORMAT_PRESETS = {
  // Jun 8, 2026
  date: 'MMM d, yyyy',
  // Jun 08, 2026
  'date-padded-day': 'MMM dd, yyyy',
  // 9:05:12 AM
  time: 'h:mm:ss a',
  // 2026-06-08 09:05:12 EDT
  'exact-timestamp': 'yyyy-MM-dd HH:mm:ss zzz',
} as const

type DateFormatPreset = keyof typeof DATE_FORMAT_PRESETS | 'compact-timestamp'

// Resolves a preset to a date-fns format string; compact-timestamp varies by year.
// e.g. current year -> 'MMM d, h:mm:ss a zzz' (Jun 8, 9:05:12 AM EDT)
// e.g. other year -> 'yyyy MMM d, h:mm:ss a zzz' (2025 Jun 8, 9:05:12 AM EST)
const resolveDateFormatPreset = (
  value: Date,
  timezone: Timezone,
  preset: DateFormatPreset
): string => {
  if (preset === 'compact-timestamp') {
    const timestampYear = formatInTimeZone(value, timezone, 'yyyy')
    const currentYear = formatInTimeZone(Date.now(), timezone, 'yyyy')

    if (timestampYear === currentYear) return 'MMM d, h:mm:ss a zzz'

    return 'yyyy MMM d, h:mm:ss a zzz'
  }

  return DATE_FORMAT_PRESETS[preset]
}

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

interface FormatDateOptions {
  timezone: Timezone
  format?: DateFormatPreset
}

const formatDate = (
  value: string | number | Date,
  { timezone, format = 'date' }: FormatDateOptions
): string | null => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return formatInTimeZone(
    date,
    timezone,
    resolveDateFormatPreset(date, timezone, format)
  )
}

const formatZonedExactTimestamp = (
  value: string | number | Date,
  timezone: Timezone
): string => formatInTimeZone(value, timezone, 'yyyy-MM-dd HH:mm:ss zzz')

const formatZonedBuildLogTime = (
  value: string | number | Date,
  timezone: Timezone
): string => {
  const date = new Date(value)
  const centiseconds = Math.floor((date.getMilliseconds() / 10) % 100)
    .toString()
    .padStart(2, '0')

  return `${formatInTimeZone(value, timezone, 'hh:mm:ss')}.${centiseconds} ${formatInTimeZone(value, timezone, 'a')}`
}

const formatZonedTime = (
  value: string | number | Date,
  timezone: Timezone
): string => formatInTimeZone(value, timezone, 'h:mm:ss a')

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
  formatDate,
  formatTimezoneAbbreviation,
  formatZonedBuildLogTime,
  formatZonedDateRange,
  formatZonedDateTimeInput,
  formatZonedExactTimestamp,
  formatZonedRelativeDayTime,
  formatZonedTime,
  formatZonedTimeAxisLabel,
  getZonedDateParts,
  getZonedDateTimeParts,
  shiftCalendarDays,
  zonedDateTimePartsToUtcDate,
  zonedDateTimePartsToUtcTimestamp,
  zonedInstantToCalendarDate,
}
export type {
  DateFormatPreset,
  FormatDateOptions,
  ZonedDateParts,
  ZonedDateRangeFormatOptions,
  ZonedDateTimeParts,
}
