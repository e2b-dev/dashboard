import { startOfDay } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import {
  createZonedTimeAxisLabelFormatter,
  formatDate,
  formatTimezoneAbbreviation,
  formatZonedBuildLogTime,
  formatZonedDateRange,
  formatZonedDateTimeInput,
  formatZonedExactTimestamp,
  formatZonedRelativeDayTime,
  formatZonedTime,
  formatZonedTimeAxisLabel,
  zonedDateTimePartsToUtcDate,
  zonedDateTimePartsToUtcTimestamp,
  zonedInstantToCalendarDate,
} from '@/features/dashboard/timezone'
import { requireTimezone } from './helpers/timezone'

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

  describe('zonedInstantToCalendarDate', () => {
    it('maps an instant to a local calendar date from dashboard wall-clock parts', () => {
      const calendarDate = zonedInstantToCalendarDate(
        '2023-01-01T00:00:00.000Z',
        utc
      )

      expect(calendarDate.getFullYear()).toBe(2023)
      expect(calendarDate.getMonth()).toBe(0)
      expect(calendarDate.getDate()).toBe(1)
    })

    it('uses the dashboard timezone instead of browser-local day boundaries', () => {
      const minBound = new Date('2023-01-01T00:00:00.000Z')
      const calendarMin = zonedInstantToCalendarDate(minBound, utc)

      vi.stubEnv('TZ', 'America/Los_Angeles')
      const browserLocalMin = startOfDay(minBound)
      vi.unstubAllEnvs()

      expect(browserLocalMin.getFullYear()).toBe(2022)
      expect(browserLocalMin.getMonth()).toBe(11)
      expect(browserLocalMin.getDate()).toBe(31)

      expect(calendarMin.getFullYear()).toBe(2023)
      expect(calendarMin.getMonth()).toBe(0)
      expect(calendarMin.getDate()).toBe(1)
    })

    it('maps max-bound instants to the dashboard wall-clock calendar day', () => {
      const calendarMax = zonedInstantToCalendarDate(
        '2026-02-24T18:17:41.000Z',
        utc
      )

      expect(calendarMax.getFullYear()).toBe(2026)
      expect(calendarMax.getMonth()).toBe(1)
      expect(calendarMax.getDate()).toBe(24)
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

  describe('formatDate compact-timestamp preset', () => {
    it('formats compact timestamps in the selected timezone', () => {
      const timestamp = Date.UTC(2026, 5, 8, 13, 0, 0)
      const formatted = formatDate(timestamp, {
        timezone: newYork,
        format: 'compact-timestamp',
      })

      expect(formatted).toContain('Jun 8')
      expect(formatted).toContain('9:00:00')
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

  describe('formatDate', () => {
    it('formats date-only labels in the selected timezone', () => {
      expect(
        formatDate('2026-06-08T13:00:00.000Z', { timezone: newYork })
      ).toBe('Jun 8, 2026')
      expect(
        formatDate('2026-06-08T13:00:00.000Z', {
          timezone: newYork,
          format: 'date',
        })
      ).toBe('Jun 8, 2026')
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
