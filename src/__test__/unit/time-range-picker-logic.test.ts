import {
  createTimeRangeSchema,
  normalizeTimeRangeValues,
  parsePickerDateTime,
  parseTimeRangeValuesToTimestamps,
  validateTimeRangeValues,
  type TimeRangeValues,
} from '@/ui/time-range-picker.logic'
import { describe, expect, it } from 'vitest'

const baseValues: TimeRangeValues = {
  startDate: '2026/02/18',
  startTime: '00:00:00',
  endDate: '2026/02/24',
  endTime: '23:59:59',
}

describe('time-range-picker logic', () => {
  describe('parsePickerDateTime', () => {
    it('returns null when date is missing, even if time exists', () => {
      const parsed = parsePickerDateTime('', '18:00:00', '23:59:59')
      expect(parsed).toBeNull()
    })

    it('parses canonical and display date formats', () => {
      const canonical = parsePickerDateTime(
        '2026/02/24',
        '18:17:41',
        '23:59:59'
      )
      const display = parsePickerDateTime(
        '24 / 02 / 2026',
        '18 : 17 : 41',
        '23:59:59'
      )

      expect(canonical).not.toBeNull()
      expect(display).not.toBeNull()
      expect(canonical?.getTime()).toBe(display?.getTime())
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
          bounds: {
            min: new Date(2023, 0, 1, 0, 0, 0),
          },
        }
      )

      expect(validation.issues).toEqual([])
    })

    it('validates against explicit max boundary', () => {
      const validation = validateTimeRangeValues(baseValues, {
        hideTime: false,
        bounds: {
          max: new Date(2026, 1, 24, 18, 17, 41),
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
      const timestamps = parseTimeRangeValuesToTimestamps({
        startDate: '2026/02/18',
        startTime: null,
        endDate: '2026/02/24',
        endTime: null,
      })

      expect(timestamps).not.toBeNull()
      expect(timestamps?.start).toBe(new Date(2026, 1, 18, 0, 0, 0).getTime())
      expect(timestamps?.end).toBe(new Date(2026, 1, 24, 23, 59, 59).getTime())
    })
  })

  describe('createTimeRangeSchema', () => {
    it('applies the same boundary validation as logic helpers', () => {
      const schema = createTimeRangeSchema({
        hideTime: false,
        bounds: {
          max: new Date(2026, 1, 24, 18, 17, 41),
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
})
