import * as chrono from 'chrono-node'
import { format, isValid } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { Timezone } from '@/features/dashboard/timezone/schema'

interface CalendarDateParts {
  year: number
  month: number
  day: number
}

interface CalendarDateTimeParts extends CalendarDateParts {
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

const getDateParts = (
  value: string | number | Date,
  timezone: Timezone
): CalendarDateParts => {
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

const getDateTimeParts = (
  value: string | number | Date,
  timezone: Timezone
): CalendarDateTimeParts => {
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

const pad = (value: number): string => String(value).padStart(2, '0')

const formatDateTimeInput = (
  value: string | number | Date,
  timezone: Timezone
): { date: string; time: string } => ({
  date: formatInTimeZone(value, timezone, 'yyyy/MM/dd'),
  time: formatInTimeZone(value, timezone, 'HH:mm:ss'),
})

const instantToCalendarDate = (
  value: string | number | Date,
  timezone: Timezone
): Date => {
  const { date } = formatDateTimeInput(value, timezone)
  const [year = 0, month = 0, day = 0] = date.split('/').map(Number)

  return new Date(year, month - 1, day)
}

// Converts timezone wall-clock parts to UTC; e.g. 2026-06-08 09:00:00 in America/New_York -> 2026-06-08T13:00:00.000Z.
// DST gaps/overlaps are resolved by date-fns-tz consistently instead of rejected.
const dateTimePartsToUtcDate = (
  parts: CalendarDateTimeParts,
  timezone: Timezone
): Date => {
  const wallClockValue = `${parts.year}-${pad(parts.month)}-${pad(
    parts.day
  )}T${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`

  return fromZonedTime(wallClockValue, timezone)
}

const dateTimePartsToUtcTimestamp = (
  parts: CalendarDateTimeParts,
  timezone: Timezone
): number => dateTimePartsToUtcDate(parts, timezone).getTime()

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

// Static date-fns format strings for known display presets.
const DATE_FORMAT_PRESETS = {
  // Jun 8, 2026
  date: 'MMM d, yyyy',
  // 9:05:12 AM
  time: 'h:mm:ss a',
  // Jun 8, 2026 at 09:05:12 AM
  'date-time-padded-hour': "MMM d, yyyy 'at' hh:mm:ss a",
  // Jun 8
  'month-day': 'MMM d',
  // 2026
  year: 'yyyy',
  // 09:05
  'time-24h-no-seconds': 'HH:mm',
  // 09:05:12
  'time-24h': 'HH:mm:ss',
  // 2026-06-08 09:05:12 EDT
  'exact-timestamp': 'yyyy-MM-dd HH:mm:ss zzz',
} as const

type StaticDateFormatPreset = keyof typeof DATE_FORMAT_PRESETS

// Special presets resolved outside DATE_FORMAT_PRESETS:
// compact-timestamp: Jun 8, 9:05:12 AM EDT (current year) / 2025 Jun 8, 9:05:12 AM EST
// time-with-centiseconds: 09:05:09.87 AM
type DateFormat =
  | StaticDateFormatPreset
  | 'compact-timestamp'
  | 'time-with-centiseconds'

// Resolves a preset to a date-fns format string; compact-timestamp varies by year.
// e.g. current year -> 'MMM d, h:mm:ss a zzz' (Jun 8, 9:05:12 AM EDT)
// e.g. other year -> 'yyyy MMM d, h:mm:ss a zzz' (2025 Jun 8, 9:05:12 AM EST)
const resolveDateFormatPreset = (
  value: Date,
  timezone: Timezone,
  preset: StaticDateFormatPreset | 'compact-timestamp'
): string => {
  if (preset === 'compact-timestamp') {
    const timestampYear = formatInTimeZone(value, timezone, 'yyyy')
    const currentYear = formatInTimeZone(Date.now(), timezone, 'yyyy')

    if (timestampYear === currentYear) return 'MMM d, h:mm:ss a zzz'

    return 'yyyy MMM d, h:mm:ss a zzz'
  }

  return DATE_FORMAT_PRESETS[preset]
}

interface FormatDateOptions {
  timezone: Timezone
  format?: DateFormat
}

const formatTimeWithCentiseconds = (
  value: Date,
  timezone: Timezone
): string => {
  const centiseconds = Math.floor((value.getMilliseconds() / 10) % 100)
    .toString()
    .padStart(2, '0')

  return `${formatInTimeZone(value, timezone, 'hh:mm:ss')}.${centiseconds} ${formatInTimeZone(value, timezone, 'a')}`
}

const formatDate = (
  value: string | number | Date,
  { timezone, format = 'date' }: FormatDateOptions
): string | null => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  if (format === 'time-with-centiseconds')
    return formatTimeWithCentiseconds(date, timezone)

  return formatInTimeZone(
    date,
    timezone,
    resolveDateFormatPreset(date, timezone, format)
  )
}

interface FormatDateRangeOptions {
  timezone: Timezone
  format?: DateFormat
}

const TIMEZONE_INCLUSIVE_DATE_FORMAT_PRESETS: ReadonlySet<DateFormat> = new Set(
  ['compact-timestamp', 'exact-timestamp']
)

const formatDateRange = (
  start: string | number | Date,
  end: string | number | Date,
  { timezone, format = 'date' }: FormatDateRangeOptions
): string => {
  const startLabel = formatDate(start, { timezone, format }) ?? ''
  const endLabel = formatDate(end, { timezone, format }) ?? ''

  if (TIMEZONE_INCLUSIVE_DATE_FORMAT_PRESETS.has(format)) {
    return `${startLabel} - ${endLabel}`
  }

  return `${startLabel} - ${endLabel} ${formatTimezoneAbbreviation(end, timezone)}`
}

interface DateTimeParts {
  datePart: string
  timePart: string
  subsecondPart: string | null
  timezonePart: string
  iso: string
}

type DatePartsFormatPreset =
  | 'date-time'
  | 'date-time-with-centiseconds'
  | 'date-year-time-no-seconds'

interface FormatDatePartsOptions {
  timezone: Timezone
  format?: DatePartsFormatPreset
}

const DATE_PARTS_PRESET_OPTIONS: Record<
  DatePartsFormatPreset,
  {
    includeSeconds: boolean
    includeYear: boolean
    includeCentiseconds: boolean
  }
> = {
  'date-time': {
    includeSeconds: true,
    includeYear: false,
    includeCentiseconds: false,
  },
  'date-time-with-centiseconds': {
    includeSeconds: true,
    includeYear: false,
    includeCentiseconds: true,
  },
  'date-year-time-no-seconds': {
    includeSeconds: false,
    includeYear: true,
    includeCentiseconds: false,
  },
}

const formatDateParts = (
  value: string | number | Date,
  { timezone, format = 'date-time' }: FormatDatePartsOptions
): DateTimeParts | null => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const { includeSeconds, includeYear, includeCentiseconds } =
    DATE_PARTS_PRESET_OPTIONS[format]

  const dateFormatterOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  }
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    ...dateFormatterOptions,
  })
  const dateWithYearFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    ...dateFormatterOptions,
  })
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...dateFormatterOptions,
  })
  const timeNoSecondsFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...dateFormatterOptions,
  })
  const timezoneFormatter = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
    ...dateFormatterOptions,
  })

  const timezonePart =
    timezoneFormatter
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? timezone

  return {
    datePart: (includeYear ? dateWithYearFormatter : dateFormatter).format(
      date
    ),
    timePart: (includeSeconds ? timeFormatter : timeNoSecondsFormatter).format(
      date
    ),
    subsecondPart: includeCentiseconds
      ? Math.floor((date.getMilliseconds() / 10) % 100)
          .toString()
          .padStart(2, '0')
      : null,
    timezonePart,
    iso: date.toISOString(),
  }
}

// Returns a relative day label for a timestamp; e.g. today in NY -> "Today", prior day -> "Yesterday", else "Jun 9, 2026".
const getRelativeDay = (
  value: string | number | Date,
  timezone: Timezone
): string => {
  const valueKey = formatInTimeZone(value, timezone, 'yyyy-MM-dd')
  const todayKey = formatInTimeZone(Date.now(), timezone, 'yyyy-MM-dd')
  const yesterdayKey = formatInTimeZone(
    Date.now() - 24 * 60 * 60 * 1000,
    timezone,
    'yyyy-MM-dd'
  )

  if (valueKey === todayKey) return 'Today'
  if (valueKey === yesterdayKey) return 'Yesterday'

  return formatInTimeZone(value, timezone, 'PP')
}

function formatChartTimestampLocal(
  timestamp: number | string | Date,
  showDate = false
): string {
  const date = new Date(timestamp)

  if (showDate) {
    return format(date, 'MMM d')
  }

  return format(date, 'h:mm:ss a')
}

function formatChartTimestampUTC(
  timestamp: number | string | Date,
  showDate = false
): string {
  const date = new Date(timestamp)

  if (showDate) {
    return formatInTimeZone(date, 'UTC', 'MMM d')
  }

  return formatInTimeZone(date, 'UTC', 'h:mm:ss a')
}

const formatRelativeAgo = (date: Date): string => {
  const now = Date.now()
  const timestamp = date.getTime()
  const seconds = Math.floor((now - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }

  const years = Math.floor(days / 365)
  return `${years}y ago`
}

function parseUTCDateComponents(date: string | Date) {
  const dateTimeString = new Date(date).toUTCString()
  const [day, dateStr, month, year, time, timezone] = dateTimeString.split(' ')

  return {
    day,
    date: dateStr,
    month,
    year,
    time,
    timezone,
    full: dateTimeString,
  }
}

function formatTimeAxisLabel(
  value: string | number,
  showDate = false,
  useLocal = true
): string {
  const date = new Date(value)

  if (useLocal) {
    return formatChartTimestampLocal(date, showDate)
  }

  return formatChartTimestampUTC(date, showDate)
}

function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000)

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  const hours = Math.floor(seconds / 3600)
  return `${hours} hour${hours !== 1 ? 's' : ''}`
}

function formatDurationCompact(
  ms: number,
  showDecimalSeconds = false,
  padTrailingField = false
): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const padDurationPart = (value: number) =>
    padTrailingField ? pad(value) : `${value}`

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${padDurationPart(remainingMinutes)}m`
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${padDurationPart(remainingSeconds)}s`
  }
  return showDecimalSeconds
    ? `${seconds}.${Math.floor((ms % 1000) / 100)}s`
    : `${seconds}s`
}

function formatTimeAgoCompact(ms: number): string {
  const minutes = Math.floor(ms / 1000 / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)

  if (minutes < 1) {
    return '< 1m ago'
  }
  if (hours < 1) {
    return `${minutes}m ago`
  }
  if (days < 1) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m ago`
  }
  if (months < 1) {
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h ago`
  }

  const remainingDays = days % 30
  return `${months}mo ${remainingDays}d ago`
}

function formatAveragingPeriod(stepMs: number): string {
  return `${formatDuration(stepMs)} average`
}

function tryParseDatetime(input: string): Date | null {
  if (!input.trim()) return null

  const timestamp = Number(input)
  if (!Number.isNaN(timestamp)) {
    const date = new Date(
      timestamp < 10000000000 ? timestamp * 1000 : timestamp
    )
    if (isValid(date)) return date
  }

  try {
    const parsedDate = chrono.parseDate(input)
    return parsedDate || null
  } catch {
    return null
  }
}

function formatDateWithSpaces(date: Date | null): string {
  if (!date) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day} / ${month} / ${year}`
}

function formatTimeWithSpaces(
  hours: string | number,
  minutes: string | number,
  seconds: string | number
): string {
  const h = String(hours).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')
  const s = String(seconds).padStart(2, '0')
  return `${h} : ${m} : ${s}`
}

function parseDateTimeComponents(dateTimeStr: string): {
  date: string
  time: string
} {
  if (!dateTimeStr) return { date: '', time: '' }
  const parsed = tryParseDatetime(dateTimeStr)
  if (!parsed) return { date: '', time: '' }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  const seconds = String(parsed.getSeconds()).padStart(2, '0')

  return {
    date: `${year}/${month}/${day}`,
    time: `${hours}:${minutes}:${seconds}`,
  }
}

export {
  dateTimePartsToUtcDate,
  dateTimePartsToUtcTimestamp,
  formatAveragingPeriod,
  formatChartTimestampLocal,
  formatChartTimestampUTC,
  formatDate,
  formatDateParts,
  formatDateRange,
  formatDateTimeInput,
  formatDateWithSpaces,
  formatDuration,
  formatDurationCompact,
  formatRelativeAgo,
  formatTimeAgoCompact,
  formatTimeAxisLabel,
  formatTimeWithSpaces,
  formatTimezoneAbbreviation,
  getDateParts,
  getDateTimeParts,
  getRelativeDay,
  instantToCalendarDate,
  parseDateTimeComponents,
  parseUTCDateComponents,
  shiftCalendarDays,
  tryParseDatetime,
}
export type { CalendarDateTimeParts, DateFormat }
