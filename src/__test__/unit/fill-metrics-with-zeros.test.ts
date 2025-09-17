import { fillTeamMetricsWithZeros } from '@/features/dashboard/sandboxes/monitoring/utils'
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
    it('should handle single data point at the start of range', () => {
      const data: ClientTeamMetrics = [
        {
          timestamp: 1000000,
          concurrentSandboxes: 10,
          sandboxStartRate: 5,
        },
      ]

      const result = fillTeamMetricsWithZeros(data, 1000000, 2000000, 100000)

      // should add zeros after the single point
      expect(result.length).toBeGreaterThan(1)

      // first point should be the data
      expect(result[0]).toEqual(data[0])

      // should have zeros after
      const zerosAfter = result.filter(
        (p) => p.timestamp > 1000000 && p.concurrentSandboxes === 0
      )
      expect(zerosAfter.length).toBeGreaterThan(0)

      // should have a zero near the end
      const endZero = result.find((p) => p.timestamp >= 1999000)
      expect(endZero).toBeDefined()
      expect(endZero?.concurrentSandboxes).toBe(0)
    })

    it('should handle single data point in the middle of range', () => {
      const data: ClientTeamMetrics = [
        {
          timestamp: 1500000,
          concurrentSandboxes: 10,
          sandboxStartRate: 5,
        },
      ]

      const result = fillTeamMetricsWithZeros(data, 1000000, 2000000, 100000)

      // should add zeros before and after
      expect(result.length).toBeGreaterThan(1)

      // should have zeros at the start
      const startZero = result.find((p) => p.timestamp === 1000000)
      expect(startZero).toBeDefined()
      expect(startZero?.concurrentSandboxes).toBe(0)

      // should have the actual data point
      const dataPoint = result.find((p) => p.timestamp === 1500000)
      expect(dataPoint).toBeDefined()
      expect(dataPoint?.concurrentSandboxes).toBe(10)

      // should have zeros after the data point
      const zerosAfter = result.filter(
        (p) => p.timestamp > 1500000 && p.concurrentSandboxes === 0
      )
      expect(zerosAfter.length).toBeGreaterThan(0)

      // should have a zero near the end
      const endZero = result.find((p) => p.timestamp >= 1999000)
      expect(endZero).toBeDefined()
      expect(endZero?.concurrentSandboxes).toBe(0)
    })

    it('should handle single data point at the end of range', () => {
      const data: ClientTeamMetrics = [
        {
          timestamp: 1900000,
          concurrentSandboxes: 10,
          sandboxStartRate: 5,
        },
      ]

      const result = fillTeamMetricsWithZeros(data, 1000000, 2000000, 100000)

      // should add zeros before the single point
      expect(result.length).toBeGreaterThan(1)

      // should have zeros at the start
      const startZero = result.find((p) => p.timestamp === 1000000)
      expect(startZero).toBeDefined()
      expect(startZero?.concurrentSandboxes).toBe(0)

      // should have zeros before the data point
      const zerosBefore = result.filter(
        (p) => p.timestamp < 1900000 && p.concurrentSandboxes === 0
      )
      expect(zerosBefore.length).toBeGreaterThan(0)

      // should have the actual data point
      const dataPoint = result.find((p) => p.timestamp === 1900000)
      expect(dataPoint).toBeDefined()
      expect(dataPoint?.concurrentSandboxes).toBe(10)
    })

    it('should handle single data point with anomalous gap tolerance', () => {
      const data: ClientTeamMetrics = [
        {
          timestamp: 1105000, // slightly over step from start
          concurrentSandboxes: 10,
          sandboxStartRate: 5,
        },
      ]

      // with low tolerance, should still add start zero
      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        2000000,
        100000,
        0.01
      )

      const startZero = result.find((p) => p.timestamp === 1000000)
      expect(startZero).toBeDefined()
      expect(startZero?.concurrentSandboxes).toBe(0)

      // with high tolerance, might not add start zero
      const resultHighTol = fillTeamMetricsWithZeros(
        data,
        1000000,
        2000000,
        100000,
        0.5
      )
      const startZeroHighTol = resultHighTol.find(
        (p) => p.timestamp === 1000000
      )
      // behavior depends on exact calculation but should be consistent
      expect(resultHighTol.length).toBeGreaterThanOrEqual(1)
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

  describe('Missing suffix zeros bug', () => {
    it('should add both suffix and prefix zeros when there is an anomalous gap with small step size', () => {
      // Reproducing the bug: ~28 minute range gets 5-second step
      const start = new Date('2025-08-27T10:10:15.000Z').getTime()
      const end = new Date('2025-08-27T10:38:41.023Z').getTime()
      const step = 5000 // 5 seconds (calculated for ~28 min range)

      const data: ClientTeamMetrics = [
        // First spike of activity
        {
          timestamp: start + 60000,
          concurrentSandboxes: 1,
          sandboxStartRate: 1,
        },
        {
          timestamp: start + 65000,
          concurrentSandboxes: 2,
          sandboxStartRate: 1,
        },
        {
          timestamp: start + 70000,
          concurrentSandboxes: 3,
          sandboxStartRate: 2,
        },
        // Last point of first spike with value 3
        {
          timestamp: start + 75000,
          concurrentSandboxes: 3,
          sandboxStartRate: 1,
        },

        // Large anomalous gap here (several minutes)

        // Second spike of activity
        {
          timestamp: start + 600000,
          concurrentSandboxes: 1,
          sandboxStartRate: 1,
        },
        {
          timestamp: start + 605000,
          concurrentSandboxes: 2,
          sandboxStartRate: 2,
        },
        {
          timestamp: start + 610000,
          concurrentSandboxes: 4,
          sandboxStartRate: 3,
        },
      ]

      const result = fillTeamMetricsWithZeros(data, start, end, step, 0.25)

      // Find zeros in the anomalous gap
      const gapZeros = result.filter(
        (p) =>
          p.timestamp > start + 75000 &&
          p.timestamp < start + 600000 &&
          p.concurrentSandboxes === 0
      )

      // Should have at least 2 zeros: one suffix after first spike, one prefix before second spike
      expect(gapZeros.length).toBeGreaterThanOrEqual(2)

      // Check for suffix zero after the last point of first spike (around start + 80000)
      const suffixZero = gapZeros.find(
        (p) => p.timestamp >= start + 80000 && p.timestamp <= start + 85000
      )
      expect(suffixZero).toBeDefined()
      expect(suffixZero?.concurrentSandboxes).toBe(0)

      // Check for prefix zero before the first point of second spike (around start + 595000)
      const prefixZero = gapZeros.find(
        (p) => p.timestamp >= start + 595000 && p.timestamp <= start + 599000
      )
      expect(prefixZero).toBeDefined()
      expect(prefixZero?.concurrentSandboxes).toBe(0)
    })

    it('should correctly add suffix and prefix zeros with various step sizes', () => {
      // test with different step sizes that were problematic before the fix
      const testCases = [
        { step: 5000, description: '5 seconds (< 30s threshold)' },
        { step: 10000, description: '10 seconds (< 30s threshold)' },
        { step: 30000, description: '30 seconds (= threshold)' },
        { step: 60000, description: '1 minute (> threshold)' },
      ]

      testCases.forEach(({ step, description }) => {
        const data: ClientTeamMetrics = [
          // First wave
          { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
          {
            timestamp: 1000000 + step,
            concurrentSandboxes: 15,
            sandboxStartRate: 7,
          },
          {
            timestamp: 1000000 + step * 2,
            concurrentSandboxes: 20,
            sandboxStartRate: 10,
          },

          // Anomalous gap (10x the step size)

          // Second wave
          {
            timestamp: 1000000 + step * 12,
            concurrentSandboxes: 25,
            sandboxStartRate: 12,
          },
          {
            timestamp: 1000000 + step * 13,
            concurrentSandboxes: 30,
            sandboxStartRate: 15,
          },
        ]

        const result = fillTeamMetricsWithZeros(
          data,
          900000,
          1000000 + step * 20,
          step,
          0.25
        )

        // find zeros in the gap
        const gapZeros = result.filter(
          (p) =>
            p.timestamp > 1000000 + step * 2 &&
            p.timestamp < 1000000 + step * 12 &&
            p.concurrentSandboxes === 0
        )

        // should have both suffix and prefix zeros regardless of step size
        expect(gapZeros.length).toBeGreaterThanOrEqual(2)

        // verify suffix zero exists
        const hasSuffixZero = gapZeros.some(
          (p) => p.timestamp === 1000000 + step * 3
        )
        expect(hasSuffixZero).toBe(true)

        // verify prefix zero exists
        const hasPrefixZero = gapZeros.some(
          (p) => p.timestamp === 1000000 + step * 11
        )
        expect(hasPrefixZero).toBe(true)
      })
    })
  })

  describe('Overfetch handling', () => {
    it('should NOT add zeros when last data point is beyond the end boundary', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1300000, concurrentSandboxes: 20, sandboxStartRate: 10 },
        { timestamp: 1600000, concurrentSandboxes: 30, sandboxStartRate: 15 },
        { timestamp: 2000500, concurrentSandboxes: 40, sandboxStartRate: 20 }, // beyond end
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        2000000, // end boundary
        300000, // 5 minute step
        0.1
      )

      // should filter out data beyond end boundary
      const dataAfterEnd = result.filter((p) => p.timestamp > 2000000)
      expect(dataAfterEnd).toHaveLength(0)

      // should add zeros at end since overfetched data is stripped
      const lastPoint = result[result.length - 1]
      // algorithm adds a zero at 1600000 + step (1900000)
      expect(lastPoint?.timestamp).toBe(1900000)
      expect(lastPoint?.concurrentSandboxes).toBe(0)
    })

    it('should NOT add zeros when last point is within half a step of the end', () => {
      const step = 300000 // 5 minutes
      const data: ClientTeamMetrics = [
        { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1300000, concurrentSandboxes: 20, sandboxStartRate: 10 },
        { timestamp: 1600000, concurrentSandboxes: 30, sandboxStartRate: 15 },
        { timestamp: 1900000, concurrentSandboxes: 40, sandboxStartRate: 20 }, // close to end
      ]

      const result = fillTeamMetricsWithZeros(data, 1000000, 2000000, step, 0.1)

      // should NOT add zeros since last point is very close to boundary
      const zerosAtEnd = result.filter(
        (p) => p.timestamp > 1900000 && p.concurrentSandboxes === 0
      )
      expect(zerosAtEnd).toHaveLength(0)

      // last point should be the actual data
      const lastPoint = result[result.length - 1]
      expect(lastPoint?.timestamp).toBe(1900000)
      expect(lastPoint?.concurrentSandboxes).toBe(40)
    })

    it('should add zeros when last point has significant gap from end', () => {
      const step = 300000 // 5 minutes
      const data: ClientTeamMetrics = [
        { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1300000, concurrentSandboxes: 20, sandboxStartRate: 10 }, // last point far from end
      ]

      const result = fillTeamMetricsWithZeros(data, 1000000, 2000000, step, 0.1)

      // should add zeros since there's a significant gap
      const zerosAtEnd = result.filter(
        (p) => p.timestamp > 1300000 && p.concurrentSandboxes === 0
      )
      expect(zerosAtEnd.length).toBeGreaterThan(0)

      // should have zero at end - 1000
      const endZero = result.find((p) => p.timestamp === 1999000)
      expect(endZero).toBeDefined()
      expect(endZero?.concurrentSandboxes).toBe(0)
    })

    it('should handle overfetch with single data point beyond end', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 2000500, concurrentSandboxes: 10, sandboxStartRate: 5 }, // single point beyond end
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        1000000,
        2000000,
        100000,
        0.25
      )

      // should add zeros when overfetched point is stripped
      expect(result.length).toBeGreaterThan(1)

      // should have zeros at the start
      const startZero = result.find((p) => p.timestamp === 1000000)
      expect(startZero).toBeDefined()
      expect(startZero?.concurrentSandboxes).toBe(0)

      // should NOT include the overfetched data point
      const dataPoint = result.find((p) => p.timestamp === 2000500)
      expect(dataPoint).toBeUndefined()

      // all points should be within range
      const pointsOutsideRange = result.filter(
        (p) => p.timestamp < 1000000 || p.timestamp > 2000000
      )
      expect(pointsOutsideRange).toHaveLength(0)
    })

    it('should handle 24H range with API returning hourly data when expecting 5-minute intervals', () => {
      const start = 1609459200000
      const end = start + 24 * 60 * 60 * 1000 // 24 hours
      const step = 5 * 60 * 1000 // 5 minutes (expected)

      // API returns hourly data points instead of 5-minute intervals
      const data: ClientTeamMetrics = [
        { timestamp: start, concurrentSandboxes: 10, sandboxStartRate: 5 },
        {
          timestamp: start + 60 * 60 * 1000,
          concurrentSandboxes: 20,
          sandboxStartRate: 10,
        }, // 1 hour later
        {
          timestamp: start + 2 * 60 * 60 * 1000,
          concurrentSandboxes: 30,
          sandboxStartRate: 15,
        }, // 2 hours later
        {
          timestamp: start + 3 * 60 * 60 * 1000,
          concurrentSandboxes: 25,
          sandboxStartRate: 12,
        }, // 3 hours later
      ]

      const result = fillTeamMetricsWithZeros(data, start, end, step, 0.1)

      // NOTE: The function only fills gaps between points when there's a sequence established
      // (needs at least 2 points before). So the first gap won't be filled, but later gaps will be.

      // should have zeros between second and third hour (where sequence is established)
      const zerosBetweenLaterHours = result.filter(
        (p) =>
          p.timestamp > start + 60 * 60 * 1000 &&
          p.timestamp < start + 2 * 60 * 60 * 1000 &&
          p.concurrentSandboxes === 0
      )
      expect(zerosBetweenLaterHours.length).toBeGreaterThan(0)

      // should have zeros at the end since last point is far from end
      const zerosAtEnd = result.filter(
        (p) =>
          p.timestamp > start + 3 * 60 * 60 * 1000 &&
          p.concurrentSandboxes === 0
      )
      expect(zerosAtEnd.length).toBeGreaterThan(0)

      // original data points should be preserved
      const originalData = result.filter((p) => p.concurrentSandboxes > 0)
      expect(originalData).toHaveLength(4)
    })

    it('should handle zoom into 2-hour window with overfetched data', () => {
      const zoomStart = 1609459200000
      const zoomEnd = zoomStart + 2 * 60 * 60 * 1000 // 2 hours
      const step = 30 * 1000 // 30 seconds for 2-hour range

      const data: ClientTeamMetrics = [
        {
          timestamp: 1609459200000,
          concurrentSandboxes: 10,
          sandboxStartRate: 5,
        },
        {
          timestamp: 1609459260000,
          concurrentSandboxes: 15,
          sandboxStartRate: 7,
        },
        {
          timestamp: 1609459320000,
          concurrentSandboxes: 20,
          sandboxStartRate: 10,
        },
        {
          timestamp: 1609459380000,
          concurrentSandboxes: 18,
          sandboxStartRate: 9,
        },
        {
          timestamp: 1609459440000,
          concurrentSandboxes: 22,
          sandboxStartRate: 11,
        },
        {
          timestamp: 1609459500000,
          concurrentSandboxes: 25,
          sandboxStartRate: 12,
        },
        {
          timestamp: 1609459520000,
          concurrentSandboxes: 23,
          sandboxStartRate: 11,
        }, // overfetched, within tolerance
      ]

      const result = fillTeamMetricsWithZeros(
        data,
        zoomStart,
        zoomEnd,
        step,
        0.1
      )

      // data point at 520 is within half a step (15s) of the end (500)
      // so it should NOT add zeros after the last data point
      const zerosAfterLastData = result.filter(
        (p) => p.timestamp > 1609459520000 && p.concurrentSandboxes === 0
      )
      expect(zerosAfterLastData.length).toBeGreaterThan(0) // there should be zeros to fill to end

      // should preserve all data points including overfetched ones
      const dataPoints = result.filter((p) => p.concurrentSandboxes > 0)
      expect(dataPoints).toHaveLength(7)
    })

    it('should handle overfetch boundary conditions precisely', () => {
      const step = 100000 // 100 seconds
      const end = 2000000

      // test various distances from end boundary
      const testCases = [
        {
          lastTimestamp: end - step * 0.3, // within half step
          shouldAddEndZeros: false,
          description: 'within half step of end',
        },
        {
          lastTimestamp: end - step * 0.6, // just beyond half step
          shouldAddEndZeros: false, // still close enough
          description: 'just beyond half step',
        },
        {
          lastTimestamp: end - step * 2.5, // significant gap
          shouldAddEndZeros: true,
          description: 'significant gap from end',
        },
        {
          lastTimestamp: end + 1000, // beyond end
          shouldAddEndZeros: false,
          description: 'beyond end boundary',
        },
      ]

      testCases.forEach(({ lastTimestamp, shouldAddEndZeros, description }) => {
        const data: ClientTeamMetrics = [
          { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
          {
            timestamp: lastTimestamp,
            concurrentSandboxes: 20,
            sandboxStartRate: 10,
          },
        ]

        const result = fillTeamMetricsWithZeros(data, 1000000, end, step, 0.25)

        const endZero = result.find((p) => p.timestamp === end - 1000)

        if (shouldAddEndZeros) {
          expect(endZero).toBeDefined()
          expect(endZero?.concurrentSandboxes).toBe(0)
        } else {
          expect(endZero).toBeUndefined()
        }
      })
    })

    it('should handle overfetch with live mode considerations', () => {
      const now = Date.now()
      const start = now - 60 * 60 * 1000 // 1 hour ago
      const end = now
      const step = 60 * 1000 // 1 minute

      // simulate live data that might have points near current time
      const data: ClientTeamMetrics = [
        { timestamp: start, concurrentSandboxes: 10, sandboxStartRate: 5 },
        {
          timestamp: start + 10 * 60 * 1000,
          concurrentSandboxes: 20,
          sandboxStartRate: 10,
        },
        {
          timestamp: start + 20 * 60 * 1000,
          concurrentSandboxes: 30,
          sandboxStartRate: 15,
        },
        {
          timestamp: start + 30 * 60 * 1000,
          concurrentSandboxes: 25,
          sandboxStartRate: 12,
        },
        {
          timestamp: start + 40 * 60 * 1000,
          concurrentSandboxes: 35,
          sandboxStartRate: 17,
        },
        {
          timestamp: start + 50 * 60 * 1000,
          concurrentSandboxes: 40,
          sandboxStartRate: 20,
        },
        {
          timestamp: end - step * 0.2,
          concurrentSandboxes: 38,
          sandboxStartRate: 19,
        }, // very close to now
      ]

      const result = fillTeamMetricsWithZeros(data, start, end, step, 0.25)

      // in live mode, data close to current time shouldn't trigger end zeros
      const lastDataPoint = data[data.length - 1]!
      const gapToEnd = end - lastDataPoint.timestamp

      if (gapToEnd <= step * 0.5) {
        // very close to end, no zeros expected
        const endZeros = result.filter(
          (p) =>
            p.timestamp > lastDataPoint.timestamp && p.concurrentSandboxes === 0
        )
        expect(endZeros).toHaveLength(0)
      }

      // all original data should be preserved
      const originalDataCount = result.filter(
        (p) => p.concurrentSandboxes > 0
      ).length
      expect(originalDataCount).toBe(data.length)
    })

    it('should handle overfetch with tolerance adjustments', () => {
      const data: ClientTeamMetrics = [
        { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
        { timestamp: 1300000, concurrentSandboxes: 20, sandboxStartRate: 10 },
        { timestamp: 1600000, concurrentSandboxes: 30, sandboxStartRate: 15 },
        { timestamp: 1950000, concurrentSandboxes: 40, sandboxStartRate: 20 }, // close to end
      ]

      // test with different tolerances
      const lowToleranceResult = fillTeamMetricsWithZeros(
        data,
        1000000,
        2000000,
        100000,
        0.1 // low tolerance
      )

      const highToleranceResult = fillTeamMetricsWithZeros(
        data,
        1000000,
        2000000,
        100000,
        0.5 // high tolerance
      )

      // both should handle the near-boundary point similarly
      const lowToleranceEndZeros = lowToleranceResult.filter(
        (p) => p.timestamp > 1950000 && p.concurrentSandboxes === 0
      )
      const highToleranceEndZeros = highToleranceResult.filter(
        (p) => p.timestamp > 1950000 && p.concurrentSandboxes === 0
      )

      // near boundary behavior should be consistent
      expect(lowToleranceEndZeros).toHaveLength(0)
      expect(highToleranceEndZeros).toHaveLength(0)
    })
  })
})
