import { describe, expect, it } from 'vitest'
import type { ClientTeamMetric } from '@/core/modules/sandboxes/models.client'
import {
  createZonedTimeAxisLabelFormatter,
  transformMetrics,
} from '@/features/dashboard/sandboxes/monitoring/charts/team-metrics-chart/utils'
import {
  getDeliveryCountSeriesData,
  getResponseTimeSeriesData,
} from '@/features/dashboard/settings/webhooks/detail/chart-utils'
import { calculateAxisMax } from '@/lib/utils/chart'
import { requireTimezone } from './helpers/timezone'

describe('team-metrics-chart-utils', () => {
  const newYork = requireTimezone('America/New_York')

  describe('createZonedTimeAxisLabelFormatter', () => {
    it('uses hour labels for short ranges', () => {
      const formatter = createZonedTimeAxisLabelFormatter(
        newYork,
        60 * 60 * 1000
      )

      expect(formatter(Date.UTC(2026, 5, 8, 13, 0, 0))).toBe('09:00')
    })
  })

  describe('calculateYAxisMax', () => {
    it('should round to nice numbers based on data', () => {
      const data = [
        { x: 1, y: 80 },
        { x: 2, y: 100 },
        { x: 3, y: 60 },
      ]
      // max = 100, scale = 1.25 → 125 → snap to 150
      expect(
        calculateAxisMax(
          data.map((d) => d.y),
          1.25
        )
      ).toBe(150)
    })

    it('should use custom scale factor', () => {
      const data = [{ x: 1, y: 100 }]
      // max = 100, scale = 1.5 → 150
      expect(
        calculateAxisMax(
          data.map((d) => d.y),
          1.5
        )
      ).toBe(150)
    })

    it('should snap to nice values for different ranges', () => {
      // small values < 10
      expect(calculateAxisMax([5], 1.5)).toBe(8) // 7.5 → ceil to 8

      // values 10-100
      expect(calculateAxisMax([50], 1.5)).toBe(80) // 75 → snap to 80

      // values 100-1000
      expect(calculateAxisMax([500], 1.5)).toBe(750) // 750 → snap to 750
    })

    it('should return default for empty data', () => {
      const data: Array<{ x: number; y: number }> = []
      expect(
        calculateAxisMax(
          data.map((d) => d.y),
          1.25
        )
      ).toBe(1)
    })
  })

  describe('transformMetrics', () => {
    it('should transform concurrent sandboxes metrics', () => {
      const metrics: ClientTeamMetric[] = [
        { timestamp: 1000, concurrentSandboxes: 10, sandboxStartRate: 0.5 },
        { timestamp: 2000, concurrentSandboxes: 20, sandboxStartRate: 1.0 },
      ]
      const result = transformMetrics(metrics, 'concurrentSandboxes')
      expect(result).toEqual([
        { x: 1000, y: 10 },
        { x: 2000, y: 20 },
      ])
    })

    it('should transform start rate metrics', () => {
      const metrics: ClientTeamMetric[] = [
        { timestamp: 1000, concurrentSandboxes: 10, sandboxStartRate: 0.5 },
        { timestamp: 2000, concurrentSandboxes: 20, sandboxStartRate: 1.5 },
      ]
      const result = transformMetrics(metrics, 'sandboxStartRate')
      expect(result).toEqual([
        { x: 1000, y: 0.5 },
        { x: 2000, y: 1.5 },
      ])
    })

    it('should handle null values as 0', () => {
      const metrics: ClientTeamMetric[] = [
        { timestamp: 1000, concurrentSandboxes: 10, sandboxStartRate: 0 },
        { timestamp: 2000, concurrentSandboxes: 0, sandboxStartRate: 1.0 },
      ]
      expect(transformMetrics(metrics, 'concurrentSandboxes')).toEqual([
        { x: 1000, y: 10 },
        { x: 2000, y: 0 },
      ])
      expect(transformMetrics(metrics, 'sandboxStartRate')).toEqual([
        { x: 1000, y: 0 },
        { x: 2000, y: 1.0 },
      ])
    })
  })
})

describe('webhook chart utils', () => {
  it('fills missing delivery count buckets from API bucket data', () => {
    const rangeBounds = {
      start: Date.UTC(2026, 5, 3, 13, 30),
      end: Date.UTC(2026, 5, 3, 17, 30),
    }
    const buckets = [
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16)).toISOString(),
        total: 1,
        failed: 0,
        durationMs: {
          minimum: 65,
          average: 82,
          maximum: 99,
        },
      },
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 17)).toISOString(),
        total: 1,
        failed: 0,
        durationMs: {
          minimum: 65,
          average: 82,
          maximum: 99,
        },
      },
    ] satisfies Parameters<typeof getDeliveryCountSeriesData>[0]

    expect(getDeliveryCountSeriesData(buckets, rangeBounds, 3600)).toEqual([
      {
        synthetic: true,
        timestamp: new Date(Date.UTC(2026, 5, 3, 14)).toISOString(),
        value: 0,
      },
      {
        synthetic: true,
        timestamp: new Date(Date.UTC(2026, 5, 3, 15)).toISOString(),
        value: 0,
      },
      {
        synthetic: false,
        timestamp: new Date(Date.UTC(2026, 5, 3, 16)).toISOString(),
        value: 1,
      },
      {
        synthetic: false,
        timestamp: new Date(Date.UTC(2026, 5, 3, 17)).toISOString(),
        value: 1,
      },
    ])
  })

  it('maps response times from API bucket data', () => {
    const rangeBounds = {
      start: Date.UTC(2026, 5, 3, 16, 30),
      end: Date.UTC(2026, 5, 3, 17),
    }
    const buckets = [
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16, 40)).toISOString(),
        total: 1,
        failed: 0,
        durationMs: {
          minimum: 65,
          average: 82,
          maximum: 99,
        },
      },
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16, 50)).toISOString(),
        total: 1,
        failed: 0,
        durationMs: {
          minimum: 50,
          average: 100,
          maximum: 150,
        },
      },
    ] satisfies Parameters<typeof getResponseTimeSeriesData>[0]

    expect(getResponseTimeSeriesData(buckets, rangeBounds, 600, 'avg')).toEqual(
      [
        {
          synthetic: true,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 30)).toISOString(),
          value: 0,
        },
        {
          synthetic: false,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 40)).toISOString(),
          value: 82,
        },
        {
          synthetic: false,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 50)).toISOString(),
          value: 100,
        },
        {
          synthetic: true,
          timestamp: new Date(Date.UTC(2026, 5, 3, 17)).toISOString(),
          value: 0,
        },
      ]
    )
    expect(getResponseTimeSeriesData(buckets, rangeBounds, 600, 'min')).toEqual(
      [
        {
          synthetic: true,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 30)).toISOString(),
          value: 0,
        },
        {
          synthetic: false,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 40)).toISOString(),
          value: 65,
        },
        {
          synthetic: false,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 50)).toISOString(),
          value: 50,
        },
        {
          synthetic: true,
          timestamp: new Date(Date.UTC(2026, 5, 3, 17)).toISOString(),
          value: 0,
        },
      ]
    )
    expect(getResponseTimeSeriesData(buckets, rangeBounds, 600, 'max')).toEqual(
      [
        {
          synthetic: true,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 30)).toISOString(),
          value: 0,
        },
        {
          synthetic: false,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 40)).toISOString(),
          value: 99,
        },
        {
          synthetic: false,
          timestamp: new Date(Date.UTC(2026, 5, 3, 16, 50)).toISOString(),
          value: 150,
        },
        {
          synthetic: true,
          timestamp: new Date(Date.UTC(2026, 5, 3, 17)).toISOString(),
          value: 0,
        },
      ]
    )
  })
})
