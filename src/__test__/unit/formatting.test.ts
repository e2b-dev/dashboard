import {
  formatAveragingPeriod,
  formatChartTimestampLocal,
  formatChartTimestampUTC,
  formatCompactDate,
  formatCPUCores,
  formatDecimal,
  formatDuration,
  formatMemory,
  formatNumber,
  formatTimeAxisLabel,
  parseUTCDateComponents,
} from '@/lib/utils/formatting'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Date & Time Formatting', () => {
  beforeEach(() => {
    // Mock the current date to ensure consistent test results
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatChartTimestampUTC', () => {
    it('formats timestamp as expected in UTC', () => {
      const timestamp = new Date('2024-01-05T14:30:45Z').getTime()
      expect(formatChartTimestampUTC(timestamp)).toBe('2:30:45 PM')
    })

    it('handles Date object input', () => {
      const date = new Date('2024-01-05T14:30:45Z')
      expect(formatChartTimestampUTC(date)).toBe('2:30:45 PM')
    })

    it('handles string input', () => {
      const dateString = '2024-01-05T14:30:45Z'
      expect(formatChartTimestampUTC(dateString)).toBe('2:30:45 PM')
    })

    it('formats with date when showDate is true', () => {
      const timestamp = new Date('2024-01-05T14:30:45Z').getTime()
      expect(formatChartTimestampUTC(timestamp, true)).toBe('Jan 5')
    })
  })

  describe('formatChartTimestampLocal', () => {
    it('formats timestamp in local timezone', () => {
      const timestamp = new Date('2024-01-05T14:30:45Z').getTime()
      // result will depend on local timezone
      const result = formatChartTimestampLocal(timestamp)
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2} [AP]M/)
    })

    it('formats with date when showDate is true', () => {
      const timestamp = new Date('2024-01-05T14:30:45Z').getTime()
      expect(formatChartTimestampLocal(timestamp, true)).toBe('Jan 5')
    })
  })

  describe('formatCompactDate', () => {
    it('formats current year date without year', () => {
      const timestamp = new Date('2024-01-05T14:30:00Z').getTime()
      const result = formatCompactDate(timestamp)
      expect(result).toContain('Jan 5')
      expect(result).not.toContain('2024')
    })

    it('formats different year date with year', () => {
      const timestamp = new Date('2023-01-05T14:30:00Z').getTime()
      const result = formatCompactDate(timestamp)
      expect(result).toContain('2023')
    })
  })

  describe('parseUTCDateComponents', () => {
    it('parses UTC date into components', () => {
      const date = new Date('2024-01-05T14:30:45Z')
      const components = parseUTCDateComponents(date)

      expect(components.day).toBe('Fri,')
      expect(components.date).toBe('05')
      expect(components.month).toBe('Jan')
      expect(components.year).toBe('2024')
      expect(components.time).toBe('14:30:45')
      expect(components.timezone).toBe('GMT')
      expect(components.full).toContain('Fri, 05 Jan 2024 14:30:45 GMT')
    })
  })

  describe('formatTimeAxisLabel', () => {
    it('formats time in local timezone by default', () => {
      const timestamp = new Date('2024-01-05T14:30:45Z').getTime()
      // default is useLocal=true, so result depends on local timezone
      const result = formatTimeAxisLabel(timestamp)
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2} [AP]M/)
    })

    it('formats time in UTC when useLocal is false', () => {
      const timestamp = new Date('2024-01-05T14:30:45Z').getTime()
      expect(formatTimeAxisLabel(timestamp, false, false)).toBe('2:30:45 PM')
    })

    it('formats with date when showDate is true', () => {
      const timestamp = new Date('2024-01-05T14:30:45Z').getTime()
      expect(formatTimeAxisLabel(timestamp, true, true)).toBe('Jan 5')
    })

    it('handles midnight formatting with date', () => {
      const timestamp = new Date('2024-01-05T00:00:00Z').getTime()
      // when showDate is false, should show time even at midnight
      const result = formatTimeAxisLabel(timestamp, false, true)
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2} [AP]M/)
    })
  })

  describe('formatDuration', () => {
    it('formats seconds', () => {
      expect(formatDuration(5000)).toBe('5 seconds')
      expect(formatDuration(1000)).toBe('1 second')
    })

    it('formats minutes', () => {
      expect(formatDuration(120000)).toBe('2 minutes')
      expect(formatDuration(60000)).toBe('1 minute')
    })

    it('formats hours', () => {
      expect(formatDuration(7200000)).toBe('2 hours')
      expect(formatDuration(3600000)).toBe('1 hour')
    })
  })

  describe('formatAveragingPeriod', () => {
    it('formats averaging period text', () => {
      expect(formatAveragingPeriod(5000)).toBe('5 seconds average')
      expect(formatAveragingPeriod(60000)).toBe('1 minute average')
    })
  })
})

describe('Number Formatting', () => {
  describe('formatNumber', () => {
    it('formats number with default locale', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('formats number with custom locale', () => {
      expect(formatNumber(1234567, 'de-DE')).toBe('1.234.567')
    })
  })

  describe('formatDecimal', () => {
    it('formats decimal with default precision', () => {
      expect(formatDecimal(123.456)).toBe('123.5')
    })

    it('formats decimal with custom precision', () => {
      expect(formatDecimal(123.456, 2)).toBe('123.46')
    })

    it('formats decimal with zero precision', () => {
      expect(formatDecimal(123.456, 0)).toBe('123')
    })
  })

  describe('formatMemory', () => {
    it('formats memory in MB', () => {
      expect(formatMemory(512)).toBe('512 MB')
    })

    it('formats memory in GB', () => {
      expect(formatMemory(1536)).toBe('1.5 GB')
    })
  })

  describe('formatCPUCores', () => {
    it('formats single core', () => {
      expect(formatCPUCores(1)).toBe('1 core')
    })

    it('formats multiple cores', () => {
      expect(formatCPUCores(4)).toBe('4 cores')
    })
  })
})
