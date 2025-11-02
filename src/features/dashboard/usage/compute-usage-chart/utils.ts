import { SamplingMode } from '../types'

/**
 * Format a timestamp to a human-readable date using Intl.DateTimeFormat
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatAxisDate(
  timestamp: number,
  samplingMode: SamplingMode
): string {
  switch (samplingMode) {
    case 'hourly':
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true,
      }).format(new Date(timestamp))
    case 'daily':
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(timestamp))
    case 'weekly':
      const date = new Date(timestamp)
      const startOfYear = new Date(date.getFullYear(), 0, 1)
      const days = Math.floor(
        (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
      )
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      return `CW${weekNumber} ${date.getFullYear()}`
  }
}
