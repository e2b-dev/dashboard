import { type Timezone, TimezoneSchema } from './schema'

// Returns true when an IANA timezone is valid; e.g. "America/New_York" -> true.
const isValidTimezone = (timezone: string): timezone is Timezone =>
  TimezoneSchema.safeParse(timezone).success

// Parses a timezone preference safely; e.g. "Europe/Berlin" -> "Europe/Berlin".
const parseTimezone = (
  timezone: string | null | undefined
): Timezone | null => {
  if (!timezone) return null

  const result = TimezoneSchema.safeParse(timezone)
  if (!result.success) return null

  return result.data
}

const getUtcTimezone = (): Timezone => {
  const utcTimezone = TimezoneSchema.safeParse('UTC')
  if (utcTimezone.success) return utcTimezone.data

  throw new Error('Unable to resolve UTC timezone')
}

// Returns the browser timezone with a safe fallback; e.g. browser in New York -> "America/New_York".
const getBrowserTimezone = (): Timezone => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const parsedTimezone = parseTimezone(timezone)
  if (parsedTimezone) return parsedTimezone

  return getUtcTimezone()
}

// Returns supported IANA timezone options; e.g. first option can be "Africa/Abidjan".
const getTimezones = (): Timezone[] => {
  const browserTimezone = getBrowserTimezone()
  const utcTimezone = getUtcTimezone()

  if (typeof Intl.supportedValuesOf === 'function') {
    const timezones = Intl.supportedValuesOf('timeZone')
    if (timezones.length > 0) {
      return Array.from(new Set([utcTimezone, browserTimezone, ...timezones]))
        .filter(isValidTimezone)
        .sort()
    }
  }

  return Array.from(new Set([utcTimezone, browserTimezone])).sort()
}

// Formats a timezone for display; e.g. "America/New_York" -> "America/New York".
const formatTimezoneDisplayName = (timezone: Timezone): string =>
  timezone.replaceAll('_', ' ')

// Formats a timezone label with its current short name; e.g. "America/New_York" -> "America/New York (EST)".
const formatTimezoneLabel = (timezone: Timezone): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  })

  const timezoneName = formatter
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value

  const displayName = formatTimezoneDisplayName(timezone)
  if (!timezoneName) return displayName

  return `${displayName} (${timezoneName})`
}

export {
  formatTimezoneLabel,
  getBrowserTimezone,
  getTimezones,
  isValidTimezone,
  parseTimezone,
}
