import { startOfDay } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import {
  formatDate,
  formatDateParts,
  formatDateRange,
  formatTimezoneAbbreviation,
  formatDateTimeInput,
  getRelativeDay,
  dateTimePartsToUtcDate,
  dateTimePartsToUtcTimestamp,
  instantToCalendarDate,
} from '@/features/dashboard/timezone'
import { requireTimezone } from './helpers/timezone'

describe('timezone date-time helpers', () => {
  const newYork = requireTimezone('America/New_York')
  const berlin = requireTimezone('Europe/Berlin')
  const utc = requireTimezone('UTC')

  describe('formatDateTimeInput', () => {
    it('formats a UTC timestamp into New York picker parts', () => {
      const result = formatDateTimeInput(
        '2026-06-08T13:05:09.000Z',
        newYork
      )

      expect(result).toEqual({
        date: '2026/06/08',
        time: '09:05:09',
      })
    })

    it('formats a UTC timestamp into Berlin picker parts', () => {
      const result = formatDateTimeInput(
        '2026-06-08T13:05:09.000Z',
        berlin
      )

      expect(result).toEqual({
        date: '2026/06/08',
        time: '15:05:09',
      })
    })
  })

  describe('instantToCalendarDate', () => {
    it('maps an instant to a local calendar date from dashboard wall-clock parts', () => {
      const calendarDate = instantToCalendarDate(
        '2023-01-01T00:00:00.000Z',
        utc
      )

      expect(calendarDate.getFullYear()).toBe(2023)
      expect(calendarDate.getMonth()).toBe(0)
      expect(calendarDate.getDate()).toBe(1)
    })

    it('uses the dashboard timezone instead of browser-local day boundaries', () => {
      const minBound = new Date('2023-01-01T00:00:00.000Z')
      const calendarMin = instantToCalendarDate(minBound, utc)

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
      const calendarMax = instantToCalendarDate(
        '2026-02-24T18:17:41.000Z',
        utc
      )

      expect(calendarMax.getFullYear()).toBe(2026)
      expect(calendarMax.getMonth()).toBe(1)
      expect(calendarMax.getDate()).toBe(24)
    })
  })

  describe('dateTimePartsToUtcDate', () => {
    it('converts New York wall-clock parts to UTC', () => {
      const result = dateTimePartsToUtcDate(
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
      const result = dateTimePartsToUtcTimestamp(
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

  describe('formatDateRange', () => {
    it('formats a date-only range in the selected timezone', () => {
      const result = formatDateRange(
        '2026-06-08T13:00:00.000Z',
        '2026-06-09T13:00:00.000Z',
        { timezone: newYork }
      )

      expect(result).toBe('Jun 8, 2026 - Jun 9, 2026 EDT')
    })

    it('formats a timestamp range in the selected timezone', () => {
      const result = formatDateRange(
        '2026-06-08T13:00:00.000Z',
        '2026-06-09T13:00:00.000Z',
        { timezone: newYork, format: 'date-time-padded-hour' }
      )

      expect(result).toBe(
        'Jun 8, 2026 at 09:00:00 AM - Jun 9, 2026 at 09:00:00 AM EDT'
      )
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

    it('formats time labels in the selected timezone', () => {
      expect(
        formatDate('2026-06-08T13:05:09.000Z', {
          timezone: newYork,
          format: 'time',
        })
      ).toBe('9:05:09 AM')
    })

    it('formats 24-hour time labels in the selected timezone', () => {
      expect(
        formatDate('2026-06-08T13:05:09.000Z', {
          timezone: newYork,
          format: 'time-24h-no-seconds',
        })
      ).toBe('09:05')
      expect(
        formatDate('2026-06-08T13:05:09.000Z', {
          timezone: newYork,
          format: 'time-24h',
        })
      ).toBe('09:05:09')
    })

    it('formats exact tooltip timestamps in the selected timezone', () => {
      const result = formatDate('2026-06-08T13:00:00.000Z', {
        timezone: newYork,
        format: 'exact-timestamp',
      })

      expect(result).toContain('2026-06-08')
      expect(result).toContain('09:00:00')
      expect(result).toContain('EDT')
    })
  })

  describe('formatDate time-with-centiseconds preset', () => {
    it('formats time with centiseconds in the selected timezone', () => {
      const result = formatDate('2026-06-08T13:05:09.870Z', {
        timezone: newYork,
        format: 'time-with-centiseconds',
      })

      expect(result).toContain('09:05:09.87')
      expect(result?.toLowerCase()).toMatch(/am|pm/)
    })
  })

  describe('formatDateParts', () => {
    it('formats date-time parts in the selected timezone', () => {
      const result = formatDateParts('2026-06-08T13:05:09.870Z', {
        timezone: newYork,
      })

      expect(result).toMatchObject({
        datePart: expect.stringMatching(/Jun 08/),
        timePart: expect.stringMatching(/09:05:09/),
        subsecondPart: null,
        timezonePart: 'EDT',
        iso: '2026-06-08T13:05:09.870Z',
      })
    })

    it('formats date-time-with-centiseconds parts in the selected timezone', () => {
      const result = formatDateParts('2026-06-08T13:05:09.870Z', {
        timezone: newYork,
        format: 'date-time-with-centiseconds',
      })

      expect(result).toMatchObject({
        datePart: expect.stringMatching(/Jun 08/),
        timePart: expect.stringMatching(/09:05:09/),
        subsecondPart: '87',
        timezonePart: 'EDT',
        iso: '2026-06-08T13:05:09.870Z',
      })
    })

    it('formats date-year-time-no-seconds parts in the selected timezone', () => {
      const result = formatDateParts('2026-06-08T13:05:09.870Z', {
        timezone: newYork,
        format: 'date-year-time-no-seconds',
      })

      expect(result).toMatchObject({
        datePart: expect.stringMatching(/Jun 08, 2026/),
        timePart: expect.stringMatching(/09:05/),
        subsecondPart: null,
        timezonePart: 'EDT',
        iso: '2026-06-08T13:05:09.870Z',
      })
      expect(result?.timePart).not.toMatch(/09:05:09/)
    })

    it('returns null for invalid timestamps', () => {
      expect(
        formatDateParts('invalid', {
          timezone: newYork,
        })
      ).toBeNull()
    })
  })

  describe('getRelativeDay', () => {
    it('labels today and yesterday in the selected timezone', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-10T16:00:00.000Z'))

      expect(getRelativeDay('2026-06-10T16:00:00.000Z', newYork)).toBe('Today')
      expect(getRelativeDay('2026-06-09T16:00:00.000Z', newYork)).toBe(
        'Yesterday'
      )

      vi.useRealTimers()
    })
  })
})
