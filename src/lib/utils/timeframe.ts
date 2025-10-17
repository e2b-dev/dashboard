/**
 * Timeframe utilities for team metrics charts
 */

/**
 * TimeframState represents the UI state for TimePicker component
 * This is the interface between the picker and the URL state
 */
export interface TimeframeState {
  mode: 'live' | 'static'
  range?: number // milliseconds for live mode
  start?: number // explicit start timestamp for static mode
  end?: number // explicit end timestamp for static mode
}

/**
 * Predefined time ranges for UI
 */
export const TIME_RANGES = {
  '1h': 1000 * 60 * 60,
  '6h': 1000 * 60 * 60 * 6,
  '24h': 1000 * 60 * 60 * 24,
  '30d': 1000 * 60 * 60 * 24 * 30,
} as const

export type TimeRangeKey = keyof typeof TIME_RANGES

/**
 * Formats a timeframe as an ISO 8601 time interval
 * Format: start/end in UTC (e.g., "2024-01-15T10:30:00.000Z/2024-01-15T11:30:00.000Z")
 * Useful for clipboard copying, sharing, and APIs that accept ISO 8601 intervals
 */
export function formatTimeframeAsISO8601Interval(
  start: number | Date,
  end: number | Date
): string {
  const startISO = new Date(start).toISOString()
  const endISO = new Date(end).toISOString()
  return `${startISO}/${endISO}`
}
