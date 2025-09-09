import {
  calculateAverage,
  calculateYAxisMax,
  createChartSeries,
  createMonitoringChartOptions,
  fillMetricsWithZeros,
  transformMetricsToLineData,
} from '@/features/dashboard/sandboxes/monitoring/chart-utils'
import type { ClientTeamMetrics } from '@/types/sandboxes.types'
import { describe, expect, it } from 'vitest'

describe('chart-utils', () => {
  describe('fillMetricsWithZeros with overfetch handling', () => {
    describe('Overfetch edge case - data at or beyond boundary', () => {
      it('should NOT add zeros when last data point is beyond the end boundary', () => {
        const data: ClientTeamMetrics = [
          { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
          { timestamp: 1300000, concurrentSandboxes: 20, sandboxStartRate: 10 },
          { timestamp: 1600000, concurrentSandboxes: 30, sandboxStartRate: 15 },
          { timestamp: 2000500, concurrentSandboxes: 40, sandboxStartRate: 20 }, // beyond end
        ]

        const result = fillMetricsWithZeros(
          data,
          1000000,
          2000000, // end boundary
          300000, // 5 minute step
          0.1
        )

        // should NOT add zeros at the end since data continues beyond boundary
        const zerosAtEnd = result.filter(
          (p) => p.timestamp > 2000500 && p.concurrentSandboxes === 0
        )
        expect(zerosAtEnd).toHaveLength(0)

        // last point should be the actual data point beyond boundary
        const lastPoint = result[result.length - 1]
        expect(lastPoint?.timestamp).toBe(2000500)
        expect(lastPoint?.concurrentSandboxes).toBe(40)
      })

      it('should NOT add zeros when last point is within half a step of the end', () => {
        const step = 300000 // 5 minutes
        const data: ClientTeamMetrics = [
          { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
          { timestamp: 1300000, concurrentSandboxes: 20, sandboxStartRate: 10 },
          { timestamp: 1600000, concurrentSandboxes: 30, sandboxStartRate: 15 },
          { timestamp: 1900000, concurrentSandboxes: 40, sandboxStartRate: 20 }, // 100s from end (less than half step)
        ]

        const result = fillMetricsWithZeros(data, 1000000, 2000000, step, 0.1)

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

      it('should add zeros when last point is more than 2 steps from end', () => {
        const step = 300000 // 5 minutes
        const data: ClientTeamMetrics = [
          { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
          { timestamp: 1300000, concurrentSandboxes: 20, sandboxStartRate: 10 },
          { timestamp: 1200000, concurrentSandboxes: 30, sandboxStartRate: 15 }, // 800s from end (> 2 steps)
        ]

        const result = fillMetricsWithZeros(data, 1000000, 2000000, step, 0.1)

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
    })

    describe('API granularity mismatch detection', () => {
      it('should detect and fill gaps when API returns hourly data but step is 5 minutes', () => {
        const step = 5 * 60 * 1000 // 5 minutes
        const data: ClientTeamMetrics = [
          {
            timestamp: 1609459200000,
            concurrentSandboxes: 10,
            sandboxStartRate: 5,
          },
          {
            timestamp: 1609462800000,
            concurrentSandboxes: 20,
            sandboxStartRate: 10,
          }, // 1 hour later
          {
            timestamp: 1609466400000,
            concurrentSandboxes: 30,
            sandboxStartRate: 15,
          }, // 1 hour later
        ]

        const result = fillMetricsWithZeros(
          data,
          1609459200000,
          1609470000000,
          step,
          0.1
        )

        // should detect the 1-hour gaps as anomalous and add zeros
        const zerosInFirstGap = result.filter(
          (p) =>
            p.timestamp > 1609459200000 &&
            p.timestamp < 1609462800000 &&
            p.concurrentSandboxes === 0
        )
        expect(zerosInFirstGap.length).toBeGreaterThan(0)

        // should have added zeros at expected 5-minute intervals
        // at least one after the first point and one before the second
        const suffixZero = zerosInFirstGap.find(
          (p) => p.timestamp === 1609459200000 + step
        )
        expect(suffixZero).toBeDefined()

        const prefixZero = zerosInFirstGap.find(
          (p) => p.timestamp === 1609462800000 - step
        )
        expect(prefixZero).toBeDefined()
      })

      it('should handle first two points being anomalously far apart', () => {
        const step = 5 * 60 * 1000 // 5 minutes
        const data: ClientTeamMetrics = [
          {
            timestamp: 1609459200000,
            concurrentSandboxes: 10,
            sandboxStartRate: 5,
          },
          {
            timestamp: 1609462800000,
            concurrentSandboxes: 20,
            sandboxStartRate: 10,
          }, // 1 hour later (should be 5 min)
        ]

        const result = fillMetricsWithZeros(
          data,
          1609459200000,
          1609466400000,
          step,
          0.1
        )

        // should have added zeros between the first two points
        const zerosBetween = result.filter(
          (p) =>
            p.timestamp > 1609459200000 &&
            p.timestamp < 1609462800000 &&
            p.concurrentSandboxes === 0
        )
        expect(zerosBetween.length).toBeGreaterThan(0)

        // verify original points are preserved
        const originalPoints = result.filter((p) => p.concurrentSandboxes > 0)
        expect(originalPoints).toHaveLength(2)
      })
    })

    describe('Zoom scenarios with custom time ranges', () => {
      it('should handle zooming into a known active region correctly', () => {
        // simulating overfetched data (last point is from beyond the zoom range)
        const step = 60000 // 1 minute
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
            concurrentSandboxes: 25,
            sandboxStartRate: 12,
          },
          {
            timestamp: 1609459440000,
            concurrentSandboxes: 30,
            sandboxStartRate: 15,
          },
          {
            timestamp: 1609459520000,
            concurrentSandboxes: 35,
            sandboxStartRate: 17,
          }, // overfetched, beyond end + tolerance
        ]

        const zoomStart = 1609459200000
        const zoomEnd = 1609459500000 // zoom ends at 500, but we have data at 520

        const result = fillMetricsWithZeros(data, zoomStart, zoomEnd, step, 0.1)

        // data point at 520 is within half a step (30s) of the end (500)
        // so it should NOT add zeros after the last data point
        const zerosAfterLastData = result.filter(
          (p) => p.timestamp > 1609459520000 && p.concurrentSandboxes === 0
        )
        expect(zerosAfterLastData).toHaveLength(0)

        // should preserve all data points including overfetched ones
        const dataPoints = result.filter((p) => p.concurrentSandboxes > 0)
        expect(dataPoints).toHaveLength(6)
      })

      it('should add zeros when zooming into a region with gaps', () => {
        const step = 60000 // 1 minute
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
          // gap here - no data for several minutes
          {
            timestamp: 1609459500000,
            concurrentSandboxes: 20,
            sandboxStartRate: 10,
          },
          {
            timestamp: 1609459560000,
            concurrentSandboxes: 25,
            sandboxStartRate: 12,
          },
        ]

        const result = fillMetricsWithZeros(
          data,
          1609459200000,
          1609459600000,
          step,
          0.1
        )

        // should detect the gap and add zeros
        const zerosInGap = result.filter(
          (p) =>
            p.timestamp > 1609459260000 &&
            p.timestamp < 1609459500000 &&
            p.concurrentSandboxes === 0
        )
        expect(zerosInGap.length).toBeGreaterThan(0)
      })
    })

    describe('Step tolerance behavior', () => {
      it('should respect tolerance when detecting anomalous gaps', () => {
        const step = 100000 // 100 seconds
        const data: ClientTeamMetrics = [
          { timestamp: 1000000, concurrentSandboxes: 10, sandboxStartRate: 5 },
          { timestamp: 1100000, concurrentSandboxes: 20, sandboxStartRate: 10 },
          { timestamp: 1205000, concurrentSandboxes: 30, sandboxStartRate: 15 }, // 105% of step
        ]

        // with 10% tolerance, 105% should be within tolerance
        const resultLowTolerance = fillMetricsWithZeros(
          data,
          1000000,
          1400000,
          step,
          0.1
        )
        const zerosLow = resultLowTolerance.filter(
          (p) =>
            p.timestamp > 1100000 &&
            p.timestamp < 1205000 &&
            p.concurrentSandboxes === 0
        )
        expect(zerosLow).toHaveLength(0) // no zeros, within tolerance

        // with 3% tolerance, 105% should be anomalous
        const resultHighTolerance = fillMetricsWithZeros(
          data,
          1000000,
          1400000,
          step,
          0.03
        )
        const zerosHigh = resultHighTolerance.filter(
          (p) =>
            p.timestamp > 1100000 &&
            p.timestamp < 1205000 &&
            p.concurrentSandboxes === 0
        )
        expect(zerosHigh.length).toBeGreaterThan(0) // should add zeros
      })
    })
  })

  describe('calculateAverage', () => {
    it('should calculate average of line chart data', () => {
      const data = [
        { x: 1000, y: 10 },
        { x: 2000, y: 20 },
        { x: 3000, y: 30 },
      ]
      expect(calculateAverage(data)).toBe(20)
    })

    it('should handle null values', () => {
      const data = [
        { x: 1000, y: 10 },
        { x: 2000, y: null },
        { x: 3000, y: 30 },
      ]
      expect(calculateAverage(data)).toBe(40 / 3)
    })

    it('should return 0 for empty data', () => {
      expect(calculateAverage([])).toBe(0)
    })
  })

  describe('calculateYAxisMax', () => {
    it('should round to nice numbers without limit', () => {
      const data = [{ y: 80 }, { y: 100 }, { y: 60 }]
      expect(calculateYAxisMax(data)).toBe(150) // rounds to nearest 50
    })

    it('should show limit with padding when data reaches 80%', () => {
      const data = [{ y: 80 }, { y: 100 }, { y: 60 }]
      expect(calculateYAxisMax(data, 125)).toBe(138) // 125 * 1.1
    })

    it('should show limit with padding at 80% threshold', () => {
      const data = [{ y: 70 }, { y: 80 }, { y: 60 }]
      expect(calculateYAxisMax(data, 100)).toBe(110)
    })

    it('should use custom scale factor', () => {
      const data = [{ y: 100 }]
      expect(calculateYAxisMax(data, undefined, 1.5)).toBe(150)
    })

    it('should handle null values', () => {
      const data = [{ y: null }, { y: 50 }, { y: null }]
      expect(calculateYAxisMax(data)).toBe(70)
    })

    it('should apply padding for empty data with limit', () => {
      const data: Array<{ y: number | null }> = []
      expect(calculateYAxisMax(data, 100)).toBe(110)
    })
  })

  describe('transformMetricsToLineData', () => {
    it('should transform metrics to line chart format', () => {
      const metrics = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
      ]
      const result = transformMetricsToLineData(
        metrics,
        (m) => m.timestamp,
        (m) => m.value
      )
      expect(result).toEqual([
        { x: 1000, y: 10 },
        { x: 2000, y: 20 },
      ])
    })

    it('should handle null values', () => {
      const metrics = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: null },
      ]
      const result = transformMetricsToLineData(
        metrics,
        (m) => m.timestamp,
        (m) => m.value
      )
      expect(result).toEqual([
        { x: 1000, y: 10 },
        { x: 2000, y: null },
      ])
    })
  })

  describe('createChartSeries', () => {
    it('should create basic line series', () => {
      const data = [
        { x: 1000, y: 10 },
        { x: 2000, y: 20 },
      ]
      const series = createChartSeries({
        id: 'test',
        name: 'Test Series',
        data,
        lineColor: '#ff0000',
      })

      expect(series.id).toBe('test')
      expect(series.name).toBe('Test Series')
      expect(series.data).toEqual(data)
      expect(series.lineStyle?.color).toBe('#ff0000')
      expect(series.areaStyle).toBeUndefined()
    })

    it('should create area series with gradient', () => {
      const series = createChartSeries({
        id: 'test',
        name: 'Test Series',
        data: [],
        lineColor: '#ff0000',
        areaColors: {
          from: '#ff0000',
          to: '#ffffff',
        },
      })

      expect(series.areaStyle).toBeDefined()
      expect(series.areaStyle?.color).toMatchObject({
        type: 'linear',
        colorStops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#ffffff' },
        ],
      })
    })

    it('should convert null values to 0 in data', () => {
      const data = [
        { x: 1000, y: null },
        { x: 2000, y: 20 },
      ]
      const series = createChartSeries({
        id: 'test',
        name: 'Test Series',
        data,
        lineColor: '#ff0000',
      })

      expect(series.data).toEqual([
        { x: 1000, y: 0 },
        { x: 2000, y: 20 },
      ])
    })
  })

  describe('createMonitoringChartOptions', () => {
    it('should create chart options for static timeframe', () => {
      const options = createMonitoringChartOptions({
        timeframe: {
          start: 1000000,
          end: 2000000,
          isLive: false,
        },
      })

      expect(options.xAxis.type).toBe('time')
      expect(options.xAxis.min).toBe(1000000)
      expect(options.xAxis.max).toBe(2000000) // no extension for static
      expect(options.yAxis.splitNumber).toBe(2)
    })

    it('should extend max for live timeframe', () => {
      const options = createMonitoringChartOptions({
        timeframe: {
          start: 1609459200000, // specific timestamp for 24h range
          end: 1609545600000,
          isLive: true,
        },
      })

      expect(options.xAxis.min).toBe(1609459200000)
      // should add calculated step to max for live mode
      expect(options.xAxis.max).toBeGreaterThan(1609545600000)
    })

    it('should allow custom split number', () => {
      const options = createMonitoringChartOptions({
        timeframe: {
          start: 1000000,
          end: 2000000,
          isLive: false,
        },
        splitNumber: 5,
      })

      expect(options.yAxis.splitNumber).toBe(5)
    })
  })
})
