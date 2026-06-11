/**
 * Formatting utilities for dates, times, and numbers across the application
 * Uses date-fns for date/time formatting and toLocaleString for numbers
 */

import * as chrono from 'chrono-node'
import { format, isValid } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

// ============================================================================
// Date & Time Formatting
// ============================================================================

/**
 * Format a timestamp for display in charts and tooltips in user's local timezone
 * @param timestamp - Unix timestamp in milliseconds or Date object
 * @returns Formatted date string in user's local timezone (e.g., "Jan 5, 2:30:45 PM")
 */
export function formatChartTimestampLocal(
  timestamp: number | string | Date,
  showDate: boolean = false
): string {
  const date = new Date(timestamp)

  if (showDate) {
    return format(date, 'MMM d')
  }
  // format in user's local timezone instead of UTC
  return format(date, 'h:mm:ss a')
}

/**
 * Format a timestamp for display in charts and tooltips
 * @param timestamp - Unix timestamp in milliseconds or Date object
 * @returns Formatted date string in UTC timezone (e.g., "Jan 5, 2:30:45 PM")
 */
export function formatChartTimestampUTC(
  timestamp: number | string | Date,
  showDate: boolean = false
): string {
  const date = new Date(timestamp)

  if (showDate) {
    return formatInTimeZone(date, 'UTC', 'MMM d')
  }

  return formatInTimeZone(date, 'UTC', 'h:mm:ss a')
}

/** Formats a timestamp with a relative day label, e.g. "2026-05-19T14:35:10Z" -> "Today, 2:35:10 PM". */
export const formatDisplayTimestamp = (value: string | number | Date) => {
  const date = new Date(value)
  const now = new Date()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  const isToday = date.toDateString() === now.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const prefix = isToday
    ? 'Today'
    : isYesterday
      ? 'Yesterday'
      : date.toLocaleDateString('en-US')
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

  return `${prefix}, ${timeStr}`
}

/** Formats elapsed time as a compact relative label; e.g. `new Date(Date.now() - 7200000)` -> `"2h ago"` */
export const formatRelativeAgo = (date: Date): string => {
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

/**
 * Parse and format a UTC date string into components
 * @param date - Date string or Date object
 * @returns Object with date components
 */
export function parseUTCDateComponents(date: string | Date) {
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

/**
 * Format time axis labels for charts
 * @param value - Timestamp or date value
 * @param showDate - Whether to show the date (for day boundaries)
 * @param useLocal - Whether to use local timezone instead of UTC
 * @returns Formatted label
 */
export function formatTimeAxisLabel(
  value: string | number,
  showDate: boolean = false,
  useLocal: boolean = true
): string {
  const date = new Date(value)

  if (useLocal) {
    return formatChartTimestampLocal(date, showDate)
  }

  return formatChartTimestampUTC(date, showDate)
}
/**
 * Format a duration in milliseconds to human-readable text
 * @param durationMs - Duration in milliseconds
 * @returns Human-readable duration (e.g., "5 seconds", "2 minutes", "1 hour")
 */
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000)

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
}

export function formatDurationCompact(
  ms: number,
  showDecimalSeconds = false,
  padTrailingField = false
): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const pad = (n: number) =>
    padTrailingField ? n.toString().padStart(2, '0') : `${n}`

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${pad(remainingMinutes)}m`
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${pad(remainingSeconds)}s`
  }
  return showDecimalSeconds
    ? `${seconds}.${Math.floor((ms % 1000) / 100)}s`
    : `${seconds}s`
}

export function formatTimeAgoCompact(ms: number): string {
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

/**
 * Format an averaging period text (e.g., "5 seconds average")
 * @param stepMs - Step/period in milliseconds
 * @returns Formatted averaging period text
 */
export function formatAveragingPeriod(stepMs: number): string {
  return `${formatDuration(stepMs)} average`
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a number with locale-specific separators
 * @param value - Number to format
 * @param locale - Locale to use (defaults to 'en-US')
 * @param maxFractionDigits - Maximum decimal places to show (defaults to 0 for whole numbers)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  locale: string = 'en-US',
  maxFractionDigits: number = 0
): string {
  return value.toLocaleString(locale, {
    maximumFractionDigits: maxFractionDigits,
  })
}

/**
 * Format a decimal number with specified precision
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted number string
 */
export function formatDecimal(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format memory in MB to appropriate unit
 * @param memoryMB - Memory in megabytes
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted memory string (e.g., "512 MB", "1.5 GB")
 */
export function formatMemory(
  memoryMB: number,
  locale: string = 'en-US'
): string {
  if (memoryMB < 1024) {
    return `${formatNumber(memoryMB, locale)} MB`
  }
  return `${formatDecimal(memoryMB / 1024, 1, locale)} GB`
}

/**
 * Format CPU cores with proper pluralization
 * @param cores - Number of CPU cores
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted CPU string (e.g., "1 core", "4 cores")
 */
export function formatCPUCores(
  cores: number,
  locale: string = 'en-US'
): string {
  return `${formatNumber(cores, locale)} core${cores !== 1 ? 's' : ''}`
}

/**
 * Returns the singular or plural word for a count
 * @param count - Number used to determine singular vs plural form
 * @param singular - Singular form of the word
 * @param plural - Optional plural form override (defaults to an inferred plural form)
 * @returns Singular or plural word (e.g., "member" or "members")
 */
export const pluralize = (
  count: number,
  singular: string,
  plural?: string
): string => {
  if (count === 1) return singular
  if (plural) return plural
  if (/[sxz]$/i.test(singular) || /(ch|sh)$/i.test(singular)) {
    return `${singular}es`
  }
  if (/[^aeiou]y$/i.test(singular)) {
    return `${singular.slice(0, -1)}ies`
  }
  return `${singular}s`
}

/**
 * Format a number for chart axis labels with smart abbreviation
 * Uses whole numbers when possible, abbreviated for large numbers
 * @param value - Number to format
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted number suitable for chart axes
 */
export function formatAxisNumber(
  value: number,
  locale: string = 'en-US'
): string {
  // For chart axes, we want clean whole numbers when possible
  if (Math.abs(value) >= 1000) {
    // Use compact notation for large numbers on axes for cleaner look
    const formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 0,
    })
    return formatter.format(value)
  }

  if (value < 1 && value > 0) {
    return value.toFixed(2)
  }

  return formatNumber(value, locale)
}

// ============================================================================
// Date Parsing
// ============================================================================

/**
 * Try to parse a datetime string into a Date object using Chrono
 * Supports multiple formats including ISO, timestamps, relative times, natural language, and common formats
 * @param input - Date string to parse
 * @returns Date object if parsing succeeds, null otherwise
 */
export function tryParseDatetime(input: string): Date | null {
  if (!input.trim()) return null

  // Try parsing as timestamp first (for performance with numeric inputs)
  const timestamp = Number(input)
  if (!Number.isNaN(timestamp)) {
    // if timestamp is less than 10 digits, multiply by 1000 to get milliseconds
    const date = new Date(
      timestamp < 10000000000 ? timestamp * 1000 : timestamp
    )
    if (isValid(date)) return date
  }

  // we use Chrono for all other formats - handles ISO, natural language, relative times, and common formats
  try {
    const parsedDate = chrono.parseDate(input)
    return parsedDate || null
  } catch {
    return null
  }
}

// ============================================================================
// Date/Time Component Formatting
// ============================================================================

/**
 * Format a date for display with slashes and spaces (DD / MM / YYYY)
 * Used in date pickers and forms for better readability
 * @param date - Date to format
 * @returns Formatted date string with spaces (e.g., "15 / 03 / 2024")
 */
export function formatDateWithSpaces(date: Date | null): string {
  if (!date) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day} / ${month} / ${year}`
}

/**
 * Format time components with spaces for display (HH : MM : SS)
 * Used in time pickers for better readability
 * @param hours - Hours as string or number
 * @param minutes - Minutes as string or number
 * @param seconds - Seconds as string or number
 * @returns Formatted time string with spaces (e.g., "14 : 30 : 45")
 */
export function formatTimeWithSpaces(
  hours: string | number,
  minutes: string | number,
  seconds: string | number
): string {
  const h = String(hours).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')
  const s = String(seconds).padStart(2, '0')
  return `${h} : ${m} : ${s}`
}

/**
 * Parse a datetime string into separate date and time components
 * Returns date in YYYY/MM/DD format and time in HH:MM:SS format
 * @param dateTimeStr - Datetime string to parse
 * @returns Object with date and time strings, or empty strings if invalid
 */
export function parseDateTimeComponents(dateTimeStr: string): {
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

/**
 * Format a currency amount with the specified currency and locale
 * Always displays exactly 2 decimal places with standard rounding
 * @param amount - Amount to format
 * @param currency - Currency to use (defaults to 'USD')
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted currency string (e.g., "$100.00", "100.00 €")
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
