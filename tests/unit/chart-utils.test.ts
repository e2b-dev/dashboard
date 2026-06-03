import { describe, expect, it } from 'vitest'
import type { ClientTeamMetric } from '@/core/modules/sandboxes/models.client'
import { transformMetrics } from '@/features/dashboard/sandboxes/monitoring/charts/team-metrics-chart/utils'
import {
  getDeliveryCountSeriesData,
  getResponseTimeSeriesData,
  getTimestampBucketInterval,
} from '@/features/dashboard/settings/webhooks/detail/chart-utils'
import { calculateAxisMax } from '@/lib/utils/chart'

describe('team-metrics-chart-utils', () => {
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
  it('groups short-range delivery counts by visible hourly buckets', () => {
    const rangeBounds = {
      start: Date.UTC(2026, 5, 3, 13, 30),
      end: Date.UTC(2026, 5, 3, 17, 30),
    }
    const buckets = [
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16, 47)).toISOString(),
        total: 1,
        failed: 0,
        durationMs: {
          minimum: 65,
          average: 82,
          maximum: 99,
        },
      },
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16, 49)).toISOString(),
        total: 1,
        failed: 0,
        durationMs: {
          minimum: 65,
          average: 82,
          maximum: 99,
        },
      },
    ] satisfies Parameters<typeof getDeliveryCountSeriesData>[0]

    expect(getTimestampBucketInterval(rangeBounds)).toBe(60 * 60 * 1000)
    expect(
      getDeliveryCountSeriesData(buckets, rangeBounds, 'timestamp')
    ).toEqual([
      {
        synthetic: true,
        timestamp: new Date(Date.UTC(2026, 5, 3, 13)).toISOString(),
        value: 0,
      },
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
        value: 2,
      },
      {
        synthetic: true,
        timestamp: new Date(Date.UTC(2026, 5, 3, 17)).toISOString(),
        value: 0,
      },
    ])
  })

  it('groups short-range response times by visible hourly buckets', () => {
    const rangeBounds = {
      start: Date.UTC(2026, 5, 3, 13, 30),
      end: Date.UTC(2026, 5, 3, 17, 30),
    }
    const buckets = [
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16, 47)).toISOString(),
        total: 1,
        failed: 0,
        durationMs: {
          minimum: 65,
          average: 82,
          maximum: 99,
        },
      },
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16, 49)).toISOString(),
        total: 1,
        failed: 0,
        durationMs: {
          minimum: 50,
          average: 100,
          maximum: 150,
        },
      },
    ] satisfies Parameters<typeof getResponseTimeSeriesData>[0]

    expect(
      getResponseTimeSeriesData(buckets, rangeBounds, 'timestamp', 'avg')
    ).toEqual([
      {
        synthetic: true,
        timestamp: new Date(rangeBounds.start).toISOString(),
        value: 0,
      },
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16)).toISOString(),
        value: 91,
      },
    ])
    expect(
      getResponseTimeSeriesData(buckets, rangeBounds, 'timestamp', 'min')
    ).toEqual([
      {
        synthetic: true,
        timestamp: new Date(rangeBounds.start).toISOString(),
        value: 0,
      },
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16)).toISOString(),
        value: 50,
      },
    ])
    expect(
      getResponseTimeSeriesData(buckets, rangeBounds, 'timestamp', 'max')
    ).toEqual([
      {
        synthetic: true,
        timestamp: new Date(rangeBounds.start).toISOString(),
        value: 0,
      },
      {
        timestamp: new Date(Date.UTC(2026, 5, 3, 16)).toISOString(),
        value: 150,
      },
    ])
  })

  it('uses hourly buckets for 12-hour and today-sized ranges', () => {
    expect(
      getTimestampBucketInterval({
        start: Date.UTC(2026, 5, 3, 5),
        end: Date.UTC(2026, 5, 3, 17),
      })
    ).toBe(60 * 60 * 1000)
    expect(
      getTimestampBucketInterval({
        start: Date.UTC(2026, 5, 3, 0),
        end: Date.UTC(2026, 5, 3, 17),
      })
    ).toBe(60 * 60 * 1000)
  })
})
