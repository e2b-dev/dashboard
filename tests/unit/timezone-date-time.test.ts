import { describe, expect, it } from 'vitest'
import {
  formatTimezoneAbbreviation,
  formatZonedDateRange,
  formatZonedDateTimeInput,
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
})
