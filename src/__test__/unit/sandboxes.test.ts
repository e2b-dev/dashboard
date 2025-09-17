import { fillTeamMetricsWithZeros } from '@/lib/utils/sandboxes'
import type { ClientTeamMetrics } from '@/types/sandboxes.types'
import { describe, expect, it } from 'vitest'

describe('fillTeamMetricsWithZeros', () => {
  describe('Empty data handling', () => {
    it('should fill entire range with zeros at calculated step intervals when data is empty', () => {
      // passing step=100000 (100 seconds) which is what the function will use
      const result = fillTeamMetricsWithZeros([], 1000000, 2000000, 100000)

      // should create points at step intervals through the range
      expect(result.length).toBeGreaterThan(2)

      // first point should be at start
      expect(result[0]).toEqual({
        timestamp: 1000000,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })

      // with step=100000, points should be at 1000000, 1100000, 1200000, etc.
      const expectedTimestamps = []
      for (let t = 1000000; t < 2000000; t += 100000) {
        expectedTimestamps.push(t)
      }

      // check that we have points at regular intervals
      const hasRegularIntervals = expectedTimestamps.every((ts) =>
        result.some((p) => p.timestamp === ts)
      )
      expect(hasRegularIntervals).toBe(true)

      // last point should be the last step before end
      const lastPoint = result[result.length - 1]
      // with step=100000, last point would be at 1900000 (not 1999000 since that logic is commented out)
      expect(lastPoint?.timestamp).toBe(1900000)
      expect(lastPoint?.concurrentSandboxes).toBe(0)
      expect(lastPoint?.sandboxStartRate).toBe(0)
    })
  })

  describe('Single data point handling', () => {
    it('should return single point as-is', () => {
      const data: ClientTeamMetrics = [
        {
          timestamp: 1500000,
          concurrentSandboxes: 10,
          sandboxStartRate: 5,
        },
      ]

      const result = fillTeamMetricsWithZeros(data, 1000000, 2000000, 100000)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(data[0])
    })
  })

  describe('Sorting behavior', () => {
    it('should sort unsorted data by timestamp', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1300000, concurrentSandboxes: 30, sandboxStartRate: 15 },
        { timestamp: 1100000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1200000, concurrentSandboxes: 20, sandboxStartRate: 10 },
      ]

      const result = fillTeamMetricsWithZeros(data, 1000000, 1400000, 100000)

      // filter out any added zeros for this check
      const originalPoints = result.filter(
        (p) => p.concurrentSandboxes > 0 || p.sandboxStartRate > 0
      )
      expect(originalPoints[0]!.timestamp).toBe(1100000)
      expect(originalPoints[1]!.timestamp).toBe(1200000)
      expect(originalPoints[2]!.timestamp).toBe(1300000)
    })
  })

  describe('Gap at start handling', () => {
    it('should add zeros at start when first data point is far from start', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1300000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1400000, concurrentSandboxes: 20, sandboxStartRate: 10 },
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        1500000,
        100000,
        0.1
      )

      expect(result[0]).toEqual({
        timestamp: 1000000,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })

      expect(result[1]!).toEqual({
        timestamp: 1200000, // 1300000 - 100000
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })

      expect(result[2]!.timestamp).toBe(1300000)
      expect(result[3]!.timestamp).toBe(1400000)
    })

    it('should not add zeros when first point is within tolerance', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1105000, concurrentSandboxes: 10, sandboxStartRate: 5 }, // just 5% over step
        { timestamp: 1205000, concurrentSandboxes: 20, sandboxStartRate: 10 },
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        1300000,
        100000,
        0.1 // 10% tolerance
      )

      // gap is within tolerance
      expect(result[0]!.timestamp).toBe(1105000)
      expect(result[0]!.concurrentSandboxes).toBe(10)
    })
  })

  describe('Gap at end handling', () => {
    it('should add zeros at end when last data point is far from end', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1100000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1200000, concurrentSandboxes: 20, sandboxStartRate: 10 },
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        1500000, // end is far from last point
        100000,
        0.1
      )

      const lastPoints = result.slice(-2)

      expect(lastPoints[0]!).toEqual({
        timestamp: 1300000, // 1200000 + 100000
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })

      expect(lastPoints[1]!).toEqual({
        timestamp: 1499000, // 1500000 - 1000
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    })

    it('should not add zeros when last point is within tolerance', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1100000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1195000, concurrentSandboxes: 20, sandboxStartRate: 10 }, // just 5% under next expected step
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        1300000,
        100000,
        0.1 // 10% tolerance
      )

      // gap is within tolerance
      const lastPoint = result[result.length - 1]!
      expect(lastPoint.timestamp).toBe(1195000)
      expect(lastPoint.concurrentSandboxes).toBe(20)
    })
  })

  describe('Gap in middle handling (anomalous gaps)', () => {
    it('should fill anomalous gaps in the middle with zeros', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1100000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1200000, concurrentSandboxes: 20, sandboxStartRate: 10 },
        { timestamp: 1300000, concurrentSandboxes: 30, sandboxStartRate: 15 },
        // large gap here
        { timestamp: 1600000, concurrentSandboxes: 40, sandboxStartRate: 20 },
        { timestamp: 1700000, concurrentSandboxes: 50, sandboxStartRate: 25 },
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        1800000,
        100000,
        0.1
      )

      const zerosInGap = result.filter(
        (p) =>
          p.timestamp > 1300000 &&
          p.timestamp < 1600000 &&
          p.concurrentSandboxes === 0
      )

      expect(zerosInGap).toHaveLength(2)

      // suffix zero after the wave
      expect(zerosInGap[0]).toEqual({
        timestamp: 1400000, // 1300000 + 100000
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })

      // prefix zero before next wave
      expect(zerosInGap[1]).toEqual({
        timestamp: 1500000, // 1600000 - 100000
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    })

    it('should not fill gaps within tolerance', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1100000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1200000, concurrentSandboxes: 20, sandboxStartRate: 10 },
        { timestamp: 1305000, concurrentSandboxes: 30, sandboxStartRate: 15 }, // 5% over expected
        { timestamp: 1410000, concurrentSandboxes: 40, sandboxStartRate: 20 }, // 5% over expected
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        1500000,
        100000,
        0.1 // 10% tolerance
      )

      const zeros = result.filter(
        (p) => p.concurrentSandboxes === 0 && p.sandboxStartRate === 0
      )
      expect(zeros).toHaveLength(0)
    })
  })

  describe('Multiple gaps scenario', () => {
    it('should handle multiple anomalous gaps correctly', () => {
      const data: ClientTeamMetrics = [
        // first wave
        { timestamp: 1100000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1200000, concurrentSandboxes: 20, sandboxStartRate: 10 },
        // gap 1
        { timestamp: 1500000, concurrentSandboxes: 30, sandboxStartRate: 15 },
        { timestamp: 1600000, concurrentSandboxes: 40, sandboxStartRate: 20 },
        // gap 2
        { timestamp: 1900000, concurrentSandboxes: 50, sandboxStartRate: 25 },
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        2100000,
        100000,
        0.1
      )

      const firstGapZeros = result.filter(
        (p) =>
          p.timestamp > 1200000 &&
          p.timestamp < 1500000 &&
          p.concurrentSandboxes === 0
      )
      expect(firstGapZeros).toHaveLength(2)
      expect(firstGapZeros[0]!.timestamp).toBe(1300000) // suffix
      expect(firstGapZeros[1]!.timestamp).toBe(1400000) // prefix

      const secondGapZeros = result.filter(
        (p) =>
          p.timestamp > 1600000 &&
          p.timestamp < 1900000 &&
          p.concurrentSandboxes === 0
      )
      expect(secondGapZeros).toHaveLength(2)
      expect(secondGapZeros[0]!.timestamp).toBe(1700000) // suffix
      expect(secondGapZeros[1]!.timestamp).toBe(1800000) // prefix
    })
  })

  describe('Tolerance parameter behavior', () => {
    it('should respect custom tolerance values', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1100000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1250000, concurrentSandboxes: 20, sandboxStartRate: 10 }, // 50% over expected
      ]

      // with default tolerance (10%), should add zeros
      const resultWithDefault = fillTeamMetricsWithZeros(
        data,
        1000000,
        1400000,
        100000,
        0.1
      )
      const zerosDefault = resultWithDefault.filter(
        (p) => p.concurrentSandboxes === 0 && p.sandboxStartRate === 0
      )
      expect(zerosDefault.length).toBeGreaterThan(0)

      // with high tolerance (60%), should not add zeros
      const resultWithHighTolerance = fillTeamMetricsWithZeros(
        data,
        1000000,
        1400000,
        100000,
        0.6 // 60% tolerance
      )
      const zerosHigh = resultWithHighTolerance.filter(
        (p) => p.concurrentSandboxes === 0 && p.sandboxStartRate === 0
      )
      expect(zerosHigh).toHaveLength(0)
    })
  })

  describe('Edge cases', () => {
    it('should handle very small step sizes', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1010, concurrentSandboxes: 20, sandboxStartRate: 10 },
        { timestamp: 1040, concurrentSandboxes: 30, sandboxStartRate: 15 }, // gap
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        900,
        1100,
        10, // very small step
        0.1
      )

      const zeros = result.filter(
        (p) => p.concurrentSandboxes === 0 && p.sandboxStartRate === 0
      )
      expect(zeros.length).toBeGreaterThan(0)
    })

    it('should handle data exactly at boundaries', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 }, // exactly at start
        { timestamp: 1100000, concurrentSandboxes: 20, sandboxStartRate: 10 },
        { timestamp: 1199000, concurrentSandboxes: 30, sandboxStartRate: 15 }, // exactly at end - 1000
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        1200000,
        100000,
        0.1
      )

      expect(result[0]!.timestamp).toBe(1000000)
      expect(result[0]!.concurrentSandboxes).toBe(10) // original data, not zero

      const lastPoint = result[result.length - 1]!
      expect(lastPoint.timestamp).toBe(1199000)
      expect(lastPoint.concurrentSandboxes).toBe(30) // original data, not zero
    })

    it('should maintain data integrity when no gaps exist', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1100000, concurrentSandboxes: 20, sandboxStartRate: 10 },
        { timestamp: 1200000, concurrentSandboxes: 30, sandboxStartRate: 15 },
        { timestamp: 1300000, concurrentSandboxes: 40, sandboxStartRate: 20 },
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        1400000,
        100000,
        0.1
      )

      // return data as-is (sorted)
      expect(result).toHaveLength(4)
      expect(result.every((p) => p.concurrentSandboxes > 0)).toBe(true)
    })

    it('should handle two data points with large gap between them', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1200000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        // large gap between points, but no sequence established
        // Large gap between points, but no sequence established
        { timestamp: 1600000, concurrentSandboxes: 20, sandboxStartRate: 10 },
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000, // start is far from first point (200000 gap, anomalous)
        1800000, // end is far from last point (200000 gap, anomalous)
        100000,
        0.1
      )

      // With only two points, middle gaps are not filled (no established pattern)
      // But start/end gaps should be filled when anomalous
      expect(result.length).toBeGreaterThan(2)

      // Should add zeros at start since first point is far from start boundary
      const startZeros = result.filter(
        (p) => p.timestamp < 1200000 && p.concurrentSandboxes === 0
      )
      expect(startZeros.length).toBeGreaterThan(0)
      expect(startZeros[0]!.timestamp).toBe(1000000) // Start boundary zero

      // Should add zeros at end since last point is far from end boundary
      const endZeros = result.filter(
        (p) => p.timestamp > 1600000 && p.concurrentSandboxes === 0
      )
      expect(endZeros.length).toBeGreaterThan(0)

      // Original data points should be preserved
      const originalPoints = result.filter((p) => p.concurrentSandboxes > 0)
      expect(originalPoints).toHaveLength(2)
      expect(originalPoints[0]!.timestamp).toBe(1200000)
      expect(originalPoints[1]!.timestamp).toBe(1600000)

      // Middle gap between the two points should NOT be filled
      // (requires hasSequenceBefore which needs at least 3 points)
      const middleZeros = result.filter(
        (p) =>
          p.timestamp > 1200000 &&
          p.timestamp < 1600000 &&
          p.concurrentSandboxes === 0
      )
      expect(middleZeros).toHaveLength(0)
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle typical monitoring data with sporadic activity', () => {
      const data: ClientTeamMetrics = [
        // Morning activity
        {
          timestamp: 1609459200000,
          concurrentSandboxes: 5,
          sandboxStartRate: 2,
        },
        {
          timestamp: 1609459260000,
          concurrentSandboxes: 8,
          sandboxStartRate: 3,
        },
        {
          timestamp: 1609459320000,
          concurrentSandboxes: 12,
          sandboxStartRate: 4,
        },
        // Long gap (lunch break)
        // Afternoon activity
        {
          timestamp: 1609462800000,
          concurrentSandboxes: 15,
          sandboxStartRate: 5,
        },
        {
          timestamp: 1609462860000,
          concurrentSandboxes: 18,
          sandboxStartRate: 6,
        },
        {
          timestamp: 1609462920000,
          concurrentSandboxes: 20,
          sandboxStartRate: 7,
        },
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1609459000000,
        1609463000000,
        60000, // 1 minute step
        0.1
      )

      // Should have filled the lunch gap with zeros
      const lunchGapZeros = result.filter(
        (p) =>
          p.timestamp > 1609459320000 &&
          p.timestamp < 1609462800000 &&
          p.concurrentSandboxes === 0
      )
      expect(lunchGapZeros.length).toBeGreaterThan(0)

      // Original data should be preserved
      const originalData = result.filter((p) => p.concurrentSandboxes > 0)
      expect(originalData).toHaveLength(6)
    })

    it('should handle data with varying step sizes gracefully', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1090000, concurrentSandboxes: 20, sandboxStartRate: 10 }, // 90s step
        { timestamp: 1200000, concurrentSandboxes: 30, sandboxStartRate: 15 }, // 110s step
        { timestamp: 1305000, concurrentSandboxes: 40, sandboxStartRate: 20 }, // 105s step
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        900000,
        1400000,
        100000, // Expected 100s step
        0.15 // 15% tolerance to handle variations
      )

      // Should handle the varying steps without adding unnecessary zeros
      const zeros = result.filter(
        (p) => p.concurrentSandboxes === 0 && p.sandboxStartRate === 0
      )

      // Should only add zeros at the boundaries, not between the slightly varying steps
      expect(
        zeros.every((z) => z.timestamp < 1000000 || z.timestamp > 1305000)
      ).toBe(true)
    })
  })
})
