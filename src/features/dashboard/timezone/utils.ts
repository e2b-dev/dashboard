import { formatTimezoneAbbreviation } from '@/lib/utils/formatting'
import { type Timezone, TimezoneSchema } from './schema'

const isValidTimezone = (timezone: string): timezone is Timezone =>
  TimezoneSchema.safeParse(timezone).success

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

const getBrowserTimezone = (): Timezone => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const parsedTimezone = parseTimezone(timezone)
  if (parsedTimezone) return parsedTimezone

  return getUtcTimezone()
}

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

const formatTimezoneDisplayName = (timezone: Timezone): string =>
  timezone.replaceAll('_', ' ')

const formatTimezoneLabel = (timezone: Timezone): string => {
  const displayName = formatTimezoneDisplayName(timezone)
  const abbreviation = formatTimezoneAbbreviation(new Date(), timezone)

  return `${displayName} (${abbreviation})`
}

export {
  formatTimezoneLabel,
  getBrowserTimezone,
  getTimezones,
  isValidTimezone,
  parseTimezone,
}
