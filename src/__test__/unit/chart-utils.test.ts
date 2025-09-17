import {
  calculateAverage,
  calculateYAxisMax,
  createChartSeries,
  createMonitoringChartOptions,
  transformMetricsToLineData,
} from '@/features/dashboard/sandboxes/monitoring/charts/utils'
import { describe, expect, it } from 'vitest'

describe('chart-utils', () => {
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
      expect(calculateYAxisMax(data)).toBe(150)
    })

    it('should show limit with padding when data is at or below limit', () => {
      const data = [{ y: 80 }, { y: 100 }, { y: 60 }]
      expect(calculateYAxisMax(data, 100, undefined, 1.1)).toBe(110)
    })

    it('should apply limit padding when data exceeds limit', () => {
      const data = [{ y: 120 }, { y: 140 }, { y: 130 }]
      expect(calculateYAxisMax(data, 100, 1.25, 1.1)).toBe(200)
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
