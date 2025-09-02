/**
 * Formatting utilities for dates, times, and numbers across the application
 * Uses date-fns for date/time formatting and toLocaleString for numbers
 */

import { format, isThisYear } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

// ============================================================================
// Date & Time Formatting
// ============================================================================

/**
 * Format a timestamp for display in charts and tooltips
 * @param timestamp - Unix timestamp in milliseconds or Date object
 * @returns Formatted date string (e.g., "Jan 5, 2:30:45 PM")
 */
export function formatChartTimestamp(
  timestamp: number | string | Date
): string {
  const date = new Date(timestamp)
  // Use UTC formatting to ensure consistent display across timezones
  return formatInTimeZone(date, 'UTC', 'MMM d, h:mm:ss a')
}

/**
 * Format a date range for display (e.g., in chart range selectors)
 * @param start - Start timestamp in milliseconds
 * @param end - End timestamp in milliseconds
 * @returns Formatted range string (e.g., "Jan 5, 2:30 PM - Jan 6, 4:45 PM EST")
 */
export function formatDateRange(start: number, end: number): string {
  const startDate = new Date(start)
  const endDate = new Date(end)

  // If same year as current, omit year
  if (isThisYear(startDate)) {
    const startFormatted = format(startDate, 'MMM d, h:mm a zzz')
    const endFormatted = format(endDate, 'MMM d, h:mm a zzz')
    return `${startFormatted} - ${endFormatted}`
  }

  // Otherwise show full date with year
  const startFormatted = format(startDate, 'yyyy MMM d, h:mm a zzz')
  const endFormatted = format(endDate, 'yyyy MMM d, h:mm a zzz')
  return `${startFormatted} - ${endFormatted}`
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
 * Format a full UTC date string (for tables, detailed views)
 * @param date - Date string or Date object
 * @returns Formatted UTC string (e.g., "Mon, 05 Jan 2024 14:30:45 GMT")
 */
export function formatUTCDate(date: string | Date): string {
  return new Date(date).toUTCString()
}

/**
 * Parse and format a UTC date string into components
 * @param date - Date string or Date object
 * @returns Object with date components
 */
export function parseUTCDateComponents(date: string | Date) {
  const dateTimeString = formatUTCDate(date)
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
 * @returns Formatted label
 */
export function formatTimeAxisLabel(
  value: string | number,
  showDate: boolean = false
): string {
  const date = new Date(value)

  // Check for midnight in UTC
  if (showDate || (date.getUTCHours() === 0 && date.getUTCMinutes() === 0)) {
    return formatInTimeZone(date, 'UTC', 'MMM d')
  }

  return formatInTimeZone(date, 'UTC', 'h:mm:ss a')
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
 * Format a percentage value
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted percentage string without % sign
 */
export function formatPercentage(
  value: number,
  decimals: number = 0,
  locale: string = 'en-US'
): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format bytes to human-readable size
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted size string (e.g., "1.5 GB", "512 MB")
 */
export function formatBytes(
  bytes: number,
  decimals: number = 2,
  locale: string = 'en-US'
): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const value = bytes / Math.pow(k, i)
  return `${formatDecimal(value, decimals, locale)} ${sizes[i]}`
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
 * Format disk size in GB
 * @param sizeGB - Size in gigabytes
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted disk size string
 */
export function formatDiskSize(
  sizeGB: number,
  locale: string = 'en-US'
): string {
  return `${formatNumber(sizeGB, locale)} GB`
}

/**
 * Format a large number with abbreviation (e.g., 1.5K, 2.3M)
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @param locale - Locale to use (defaults to 'en-US')
 * @returns Formatted abbreviated number
 */
export function formatCompactNumber(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: decimals,
  })
  return formatter.format(value)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a value or return a fallback for null/undefined
 * @param value - Value to format
 * @param formatter - Formatting function to apply
 * @param fallback - Fallback string (defaults to 'n/a')
 * @returns Formatted value or fallback
 */
export function formatOrFallback<T>(
  value: T | null | undefined,
  formatter: (val: T) => string,
  fallback: string = 'n/a'
): string {
  if (value === null || value === undefined) {
    return fallback
  }
  return formatter(value)
}
