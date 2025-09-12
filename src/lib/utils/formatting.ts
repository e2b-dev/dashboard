/**
 * Formatting utilities for dates, times, and numbers across the application
 * Uses date-fns for date/time formatting and toLocaleString for numbers
 */

import * as chrono from 'chrono-node'
import { format, isThisYear, isValid } from 'date-fns'
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

/**
 * Format a date for compact display (used in chart range labels)
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatCompactDate(timestamp: number): string {
  const date = new Date(timestamp)

  if (isThisYear(date)) {
    return format(date, 'MMM d, h:mm a zzz')
  }

  return format(date, 'yyyy MMM d, h:mm a zzz')
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
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
  return value.toLocaleString(locale)
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
  if (!isNaN(timestamp)) {
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

/**
 * Format a datetime to a standard format for display in inputs
 * @param date - Date to format
 * @returns Formatted datetime string (yyyy-MM-dd HH:mm:ss)
 */
export function formatDatetimeInput(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss')
}
