import { describe, expect, it, vi } from 'vitest'
import {
  createZonedTimeAxisLabelFormatter,
  formatTimezoneAbbreviation,
  formatZonedBuildLogTime,
  formatZonedCompactDate,
  formatZonedDate,
  formatZonedDateRange,
  formatZonedDateTimeInput,
  formatZonedExactTimestamp,
  formatZonedRelativeDayTime,
  formatZonedTime,
  formatZonedTimeAxisLabel,
  parseTimezone,
  type Timezone,
  zonedDateTimePartsToUtcDate,
  zonedDateTimePartsToUtcTimestamp,
} from '@/features/dashboard/timezone'

const requireTimezone = (value: string): Timezone => {
  const timezone = parseTimezone(value)
  if (!timezone) throw new Error(`Expected ${value} to be a valid timezone`)

  return timezone
}

describe('timezone date-time helpers', () => {
  const newYork = requireTimezone('America/New_York')
  const berlin = requireTimezone('Europe/Berlin')
  const utc = requireTimezone('UTC')

  describe('formatZonedDateTimeInput', () => {
    it('formats a UTC timestamp into New York picker parts', () => {
      const result = formatZonedDateTimeInput(
        '2026-06-08T13:05:09.000Z',
        newYork
      )

      expect(result).toEqual({
        date: '2026/06/08',
        time: '09:05:09',
      })
    })

    it('formats a UTC timestamp into Berlin picker parts', () => {
      const result = formatZonedDateTimeInput(
        '2026-06-08T13:05:09.000Z',
        berlin
      )

      expect(result).toEqual({
        date: '2026/06/08',
        time: '15:05:09',
      })
    })
  })

  describe('zonedDateTimePartsToUtcDate', () => {
    it('converts New York wall-clock parts to UTC', () => {
      const result = zonedDateTimePartsToUtcDate(
        {
          year: 2026,
          month: 6,
          day: 8,
          hours: 9,
          minutes: 0,
          seconds: 0,
        },
        newYork
      )

      expect(result.toISOString()).toBe('2026-06-08T13:00:00.000Z')
    })

    it('converts UTC wall-clock parts without offset changes', () => {
      const result = zonedDateTimePartsToUtcTimestamp(
        {
          year: 2026,
          month: 6,
          day: 8,
          hours: 9,
          minutes: 0,
          seconds: 0,
        },
        utc
      )

      expect(result).toBe(Date.UTC(2026, 5, 8, 9, 0, 0))
    })
  })

  describe('formatTimezoneAbbreviation', () => {
    it('formats daylight saving and standard abbreviations', () => {
      expect(
        formatTimezoneAbbreviation('2026-06-08T13:00:00.000Z', newYork)
      ).toBe('EDT')
      expect(
        formatTimezoneAbbreviation('2026-01-08T14:00:00.000Z', newYork)
      ).toBe('EST')
    })
  })

  describe('formatZonedDateRange', () => {
    it('formats a range in the selected timezone', () => {
      const result = formatZonedDateRange(
        '2026-06-08T13:00:00.000Z',
        '2026-06-09T13:00:00.000Z',
        newYork
      )

      expect(result).toContain('Jun 8, 2026')
      expect(result).toContain('Jun 9, 2026')
      expect(result).toContain('EDT')
    })
  })

  describe('formatZonedCompactDate', () => {
    it('formats compact timestamps in the selected timezone', () => {
      expect(
        formatZonedCompactDate(Date.UTC(2026, 5, 8, 13, 0, 0), newYork)
      ).toContain('Jun 8')
      expect(
        formatZonedCompactDate(Date.UTC(2026, 5, 8, 13, 0, 0), newYork)
      ).toContain('9:00:00')
    })
  })

  describe('formatZonedTimeAxisLabel', () => {
    it('formats axis labels in the selected timezone', () => {
      expect(
        formatZonedTimeAxisLabel(Date.UTC(2026, 5, 8, 13, 5, 9), newYork)
      ).toBe('09:05')
      expect(
        formatZonedTimeAxisLabel(Date.UTC(2026, 5, 8, 13, 5, 9), newYork, true)
      ).toBe('09:05:09')
    })
  })

  describe('createZonedTimeAxisLabelFormatter', () => {
    it('uses hour labels for short ranges', () => {
      const formatter = createZonedTimeAxisLabelFormatter(
        newYork,
        60 * 60 * 1000
      )

      expect(formatter(Date.UTC(2026, 5, 8, 13, 0, 0))).toBe('09:00')
    })
  })

  describe('formatZonedDate', () => {
    it('formats date-only labels in the selected timezone', () => {
      expect(formatZonedDate('2026-06-08T13:00:00.000Z', newYork)).toBe(
        'Jun 8, 2026'
      )
      expect(
        formatZonedDate('2026-06-08T13:00:00.000Z', newYork, 'MMM dd, yyyy')
      ).toBe('Jun 08, 2026')
    })
  })

  describe('formatZonedExactTimestamp', () => {
    it('formats exact tooltip timestamps in the selected timezone', () => {
      const result = formatZonedExactTimestamp(
        '2026-06-08T13:00:00.000Z',
        newYork
      )

      expect(result).toContain('2026-06-08')
      expect(result).toContain('09:00:00')
      expect(result).toContain('EDT')
    })
  })

  describe('formatZonedBuildLogTime', () => {
    it('formats build log times with centiseconds in the selected timezone', () => {
      const result = formatZonedBuildLogTime(
        '2026-06-08T13:05:09.870Z',
        newYork
      )

      expect(result).toContain('09:05:09.87')
      expect(result.toLowerCase()).toMatch(/am|pm/)
    })
  })

  describe('formatZonedTime', () => {
    it('formats localized time labels in the selected timezone', () => {
      expect(formatZonedTime('2026-06-08T13:05:09.000Z', newYork)).toBe(
        '9:05:09 AM'
      )
    })
  })

  describe('formatZonedRelativeDayTime', () => {
    it('labels today and yesterday in the selected timezone', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-10T16:00:00.000Z'))

      expect(
        formatZonedRelativeDayTime('2026-06-10T16:00:00.000Z', newYork).prefix
      ).toBe('Today')
      expect(
        formatZonedRelativeDayTime('2026-06-09T16:00:00.000Z', newYork).prefix
      ).toBe('Yesterday')

      vi.useRealTimers()
    })
  })
})
