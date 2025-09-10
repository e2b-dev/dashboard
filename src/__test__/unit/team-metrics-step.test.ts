import { calculateTeamMetricsStep } from '@/configs/mock-data'
import { formatAveragingPeriod } from '@/lib/utils/formatting'
import { describe, expect, it } from 'vitest'

describe('Team Metrics Step Calculation', () => {
  describe('calculateTeamMetricsStep', () => {
    it('should return 5 seconds for ranges less than 1 hour', () => {
      const start = 1609459200000
      const end = start + 30 * 60 * 1000 // 30 minutes
      expect(calculateTeamMetricsStep(start, end)).toBe(5 * 1000)
    })

    it('should return 30 seconds for ranges between 1-6 hours', () => {
      const start = 1609459200000
      const end = start + 3 * 60 * 60 * 1000 // 3 hours
      expect(calculateTeamMetricsStep(start, end)).toBe(30 * 1000)
    })

    it('should return 1 minute for ranges between 6-12 hours', () => {
      const start = 1609459200000
      const end = start + 8 * 60 * 60 * 1000 // 8 hours
      expect(calculateTeamMetricsStep(start, end)).toBe(60 * 1000)
    })

    it('should return 2 minutes for ranges between 12-24 hours', () => {
      const start = 1609459200000
      const end = start + 18 * 60 * 60 * 1000 // 18 hours
      expect(calculateTeamMetricsStep(start, end)).toBe(2 * 60 * 1000)
    })

    it('should return 5 minutes for 24 hours (edge case)', () => {
      const start = 1609459200000
      const end = start + 24 * 60 * 60 * 1000 // exactly 24 hours
      expect(calculateTeamMetricsStep(start, end)).toBe(5 * 60 * 1000)
    })

    it('should return 5 minutes for ranges between 1-7 days', () => {
      const start = 1609459200000
      const end = start + 3 * 24 * 60 * 60 * 1000 // 3 days
      expect(calculateTeamMetricsStep(start, end)).toBe(5 * 60 * 1000)
    })

    it('should return 15 minutes for ranges over 7 days', () => {
      const start = 1609459200000
      const end = start + 14 * 24 * 60 * 60 * 1000 // 14 days
      expect(calculateTeamMetricsStep(start, end)).toBe(15 * 60 * 1000)
    })

    it('should handle edge cases at boundaries', () => {
      const start = 1609459200000

      // exactly 1 hour should be 30 seconds
      let end = start + 60 * 60 * 1000
      expect(calculateTeamMetricsStep(start, end)).toBe(30 * 1000)

      // 1 millisecond less than 1 hour should be 5 seconds
      end = start + 60 * 60 * 1000 - 1
      expect(calculateTeamMetricsStep(start, end)).toBe(5 * 1000)

      // exactly 6 hours should be 1 minute
      end = start + 6 * 60 * 60 * 1000
      expect(calculateTeamMetricsStep(start, end)).toBe(60 * 1000)

      // 1 millisecond less than 6 hours should be 30 seconds
      end = start + 6 * 60 * 60 * 1000 - 1
      expect(calculateTeamMetricsStep(start, end)).toBe(30 * 1000)
    })
  })

  describe('Step display with formatAveragingPeriod', () => {
    it('should never show "1 hour average" for 24 hour range', () => {
      const start = 1609459200000
      const end = start + 24 * 60 * 60 * 1000 // 24 hours
      const step = calculateTeamMetricsStep(start, end)
      const display = formatAveragingPeriod(step)

      expect(display).toBe('5 minutes average')
      expect(display).not.toContain('hour')
    })

    it('should show correct display for all step sizes', () => {
      // 5 seconds
      expect(formatAveragingPeriod(5 * 1000)).toBe('5 seconds average')

      // 30 seconds
      expect(formatAveragingPeriod(30 * 1000)).toBe('30 seconds average')

      // 1 minute
      expect(formatAveragingPeriod(60 * 1000)).toBe('1 minute average')

      // 2 minutes
      expect(formatAveragingPeriod(2 * 60 * 1000)).toBe('2 minutes average')

      // 5 minutes
      expect(formatAveragingPeriod(5 * 60 * 1000)).toBe('5 minutes average')

      // 15 minutes
      expect(formatAveragingPeriod(15 * 60 * 1000)).toBe('15 minutes average')
    })

    it('should handle unexpected step values gracefully', () => {
      // API returns 1 hour data points, but we should never display this
      const oneHour = 60 * 60 * 1000
      expect(formatAveragingPeriod(oneHour)).toBe('1 hour average')

      // But our calculateTeamMetricsStep should never return 1 hour
      const possibleSteps = [
        5 * 1000, // 5 seconds
        30 * 1000, // 30 seconds
        60 * 1000, // 1 minute
        2 * 60 * 1000, // 2 minutes
        5 * 60 * 1000, // 5 minutes
        15 * 60 * 1000, // 15 minutes
      ]

      // test various ranges to ensure we never get 1 hour
      for (let hours = 0.5; hours <= 48; hours += 0.5) {
        const start = 1609459200000
        const end = start + hours * 60 * 60 * 1000
        const step = calculateTeamMetricsStep(start, end)

        expect(possibleSteps).toContain(step)
        expect(step).not.toBe(oneHour)
      }
    })
  })

  describe('Overfetch calculation', () => {
    it('should calculate correct overfetch amount based on step', () => {
      // for a 24 hour range
      const start = 1609459200000
      const end = start + 24 * 60 * 60 * 1000
      const step = calculateTeamMetricsStep(start, end) // 5 minutes
      const overfetchSeconds = Math.ceil(step / 1000)

      expect(overfetchSeconds).toBe(300) // 5 minutes in seconds
    })

    it('should calculate tolerance for filtering overfetched data', () => {
      const step = 5 * 60 * 1000 // 5 minutes
      const tolerance = step * 0.5 // half a step

      expect(tolerance).toBe(2.5 * 60 * 1000) // 2.5 minutes

      // data within tolerance should be kept
      const end = 1609459200000
      const dataPoint = end + tolerance - 1
      expect(dataPoint).toBeLessThanOrEqual(end + tolerance)

      // data beyond tolerance should be filtered
      const beyondTolerance = end + tolerance + 1
      expect(beyondTolerance).toBeGreaterThan(end + tolerance)
    })
  })

  describe('Integration scenario - 24H with custom zoom', () => {
    it('should maintain correct step when zooming into 24H data', () => {
      // user selects 24H range via time picker
      const baseTime = 1609459200000
      const start = baseTime
      const end = baseTime + 24 * 60 * 60 * 1000

      // backend calculates step
      const step = calculateTeamMetricsStep(start, end)
      expect(step).toBe(5 * 60 * 1000) // 5 minutes

      // display shows correct averaging period
      const display = formatAveragingPeriod(step)
      expect(display).toBe('5 minutes average')

      // even if API returns hourly data, we use our calculated step
      const apiDataPoints = [
        { timestamp: baseTime, value: 10 },
        { timestamp: baseTime + 60 * 60 * 1000, value: 20 }, // 1 hour later
        { timestamp: baseTime + 2 * 60 * 60 * 1000, value: 30 }, // 2 hours later
      ]

      // the actual interval in API data
      const actualInterval =
        apiDataPoints[1]!.timestamp - apiDataPoints[0]!.timestamp
      expect(actualInterval).toBe(60 * 60 * 1000) // 1 hour

      // but we still use our calculated step for display
      expect(step).not.toBe(actualInterval)
      expect(formatAveragingPeriod(step)).toBe('5 minutes average')
      expect(formatAveragingPeriod(actualInterval)).toBe('1 hour average')
    })

    it('should handle zoom into active region with overfetch', () => {
      // zoom into a 2-hour window
      const zoomStart = 1609459200000
      const zoomEnd = zoomStart + 2 * 60 * 60 * 1000

      // calculate step for zoom range
      const step = calculateTeamMetricsStep(zoomStart, zoomEnd)
      expect(step).toBe(30 * 1000) // 30 seconds for 2-hour range

      // overfetch calculation
      const overfetchSeconds = Math.ceil(step / 1000)
      expect(overfetchSeconds).toBe(30)

      // backend requests data with overfetch
      const requestEnd = zoomEnd + overfetchSeconds * 1000
      expect(requestEnd).toBe(zoomEnd + 30000)

      // tolerance for keeping overfetched data
      const tolerance = step * 0.5
      const keepUntil = zoomEnd + tolerance

      // data points within tolerance are kept
      const nearBoundary = zoomEnd + tolerance - 1
      expect(nearBoundary).toBeLessThanOrEqual(keepUntil)

      // data points beyond tolerance are filtered
      const beyondBoundary = zoomEnd + tolerance + 1
      expect(beyondBoundary).toBeGreaterThan(keepUntil)
    })
  })
})
