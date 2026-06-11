import { startOfDay } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import { zonedInstantToCalendarDate } from '@/features/dashboard/timezone'
import {
  createTimeRangeSchema,
  normalizeTimeRangeValues,
  parsePickerDateTime,
  parseTimeRangeValuesToTimestamps,
  type TimeRangeValues,
  validateTimeRangeValues,
} from '@/ui/time-range-picker.logic'
import { requireTimezone } from './helpers/timezone'

const utc = requireTimezone('UTC')
const newYork = requireTimezone('America/New_York')

const baseValues: TimeRangeValues = {
  startDate: '2026/02/18',
  startTime: '00:00:00',
  endDate: '2026/02/24',
  endTime: '23:59:59',
}

describe('time-range-picker logic', () => {
  describe('parsePickerDateTime', () => {
    it('returns null when date is missing, even if time exists', () => {
      const parsed = parsePickerDateTime('', '18:00:00', '23:59:59', utc)
      expect(parsed).toBeNull()
    })

    it('parses canonical and display date formats', () => {
      const canonical = parsePickerDateTime(
        '2026/02/24',
        '18:17:41',
        '23:59:59',
        utc
      )
      const display = parsePickerDateTime(
        '24 / 02 / 2026',
        '18 : 17 : 41',
        '23:59:59',
        utc
      )

      expect(canonical).not.toBeNull()
      expect(display).not.toBeNull()
      expect(canonical?.getTime()).toBe(display?.getTime())
    })

    it('validates calendar dates without relying on browser-local midnight', () => {
      const parsed = parsePickerDateTime(
        '2026/12/31',
        '23:00:00',
        '00:00:00',
        utc
      )

      expect(parsed?.toISOString()).toBe('2026-12-31T23:00:00.000Z')
    })

    it('interprets wall-clock values in the selected timezone', () => {
      const parsed = parsePickerDateTime(
        '2026/06/08',
        '09:00:00',
        '00:00:00',
        newYork
      )

      expect(parsed?.toISOString()).toBe('2026-06-08T13:00:00.000Z')
    })
  })

  describe('normalizeTimeRangeValues', () => {
    it('normalizes date and time strings without changing semantic values', () => {
      const normalized = normalizeTimeRangeValues({
        startDate: '18 / 02 / 2026',
        startTime: '09 : 05',
        endDate: '2026-02-24',
        endTime: '23:59:59',
      })

      expect(normalized).toEqual({
        startDate: '2026/02/18',
        startTime: '09:05:00',
        endDate: '2026/02/24',
        endTime: '23:59:59',
      })
    })
  })

  describe('validateTimeRangeValues', () => {
    it('does not enforce an implicit max boundary', () => {
      const validation = validateTimeRangeValues(
        {
          ...baseValues,
          endDate: '2026/12/31',
          endTime: '23:59:59',
        },
        {
          hideTime: false,
          timezone: utc,
          bounds: {
            min: new Date(Date.UTC(2023, 0, 1, 0, 0, 0)),
          },
        }
      )

      expect(validation.issues).toEqual([])
    })

    it('validates against explicit max boundary', () => {
      const validation = validateTimeRangeValues(baseValues, {
        hideTime: false,
        timezone: utc,
        bounds: {
          max: new Date(Date.UTC(2026, 1, 24, 18, 17, 41)),
        },
      })

      expect(validation.issues).toHaveLength(1)
      expect(validation.issues[0]).toEqual(
        expect.objectContaining({
          field: 'endDate',
        })
      )
      expect(validation.issues[0]?.message).toContain(
        'End date cannot be after'
      )
    })

    it('validates end is not before start', () => {
      const validation = validateTimeRangeValues(
        {
          ...baseValues,
          startDate: '2026/02/24',
          startTime: '20:00:00',
          endDate: '2026/02/24',
          endTime: '19:00:00',
        },
        {
          hideTime: false,
          timezone: utc,
        }
      )

      expect(validation.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'endDate',
            message: 'End date cannot be before start date',
          }),
        ])
      )
    })
  })

  describe('parseTimeRangeValuesToTimestamps', () => {
    it('converts values to start and end timestamps with fallback times', () => {
      const timestamps = parseTimeRangeValuesToTimestamps(
        {
          startDate: '2026/02/18',
          startTime: null,
          endDate: '2026/02/24',
          endTime: null,
        },
        utc
      )

      expect(timestamps).not.toBeNull()
      expect(timestamps?.start).toBe(Date.UTC(2026, 1, 18, 0, 0, 0))
      expect(timestamps?.end).toBe(Date.UTC(2026, 1, 24, 23, 59, 59))
    })

    it('converts values to UTC timestamps from the selected timezone', () => {
      const timestamps = parseTimeRangeValuesToTimestamps(
        {
          startDate: '2026/06/08',
          startTime: '09:00:00',
          endDate: '2026/06/08',
          endTime: '10:00:00',
        },
        newYork
      )

      expect(timestamps).toEqual({
        start: Date.UTC(2026, 5, 8, 13, 0, 0),
        end: Date.UTC(2026, 5, 8, 14, 0, 0),
      })
    })
  })

  describe('createTimeRangeSchema', () => {
    it('applies the same boundary validation as logic helpers', () => {
      const schema = createTimeRangeSchema({
        hideTime: false,
        timezone: utc,
        bounds: {
          max: new Date(Date.UTC(2026, 1, 24, 18, 17, 41)),
        },
      })

      const parsed = schema.safeParse(baseValues)

      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toContain(
          'End date cannot be after'
        )
      }
    })
  })

  describe('calendar boundary dates', () => {
    it('aligns disabled calendar days with dashboard timezone validation', () => {
      const minBound = new Date('2023-01-01T00:00:00.000Z')
      const calendarMin = zonedInstantToCalendarDate(minBound, utc)

      vi.stubEnv('TZ', 'America/Los_Angeles')
      const browserLocalMin = startOfDay(minBound)
      vi.unstubAllEnvs()

      expect(browserLocalMin.getDate()).toBe(31)
      expect(calendarMin.getFullYear()).toBe(2023)
      expect(calendarMin.getMonth()).toBe(0)
      expect(calendarMin.getDate()).toBe(1)

      const disabledDay = new Date(2022, 11, 31)
      const enabledDay = new Date(2023, 0, 1)

      expect(disabledDay < calendarMin).toBe(true)
      expect(enabledDay < calendarMin).toBe(false)

      const disabledValidation = validateTimeRangeValues(
        {
          startDate: '2022/12/31',
          startTime: '00:00:00',
          endDate: '2023/01/02',
          endTime: '23:59:59',
        },
        {
          hideTime: false,
          timezone: utc,
          bounds: { min: minBound },
        }
      )

      expect(disabledValidation.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'startDate',
            message: expect.stringContaining('Start date cannot be before'),
          }),
        ])
      )
    })
  })
})
