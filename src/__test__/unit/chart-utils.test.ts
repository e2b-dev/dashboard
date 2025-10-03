import {
  calculateCentralTendency,
  calculateYAxisMax,
  transformMetrics,
} from '@/features/dashboard/sandboxes/monitoring/charts/team-metrics-chart/utils'
import { ClientTeamMetric } from '@/types/sandboxes.types'
import { describe, expect, it } from 'vitest'

describe('team-metrics-chart-utils', () => {
  describe('calculateCentralTendency', () => {
    it('should calculate average of chart data', () => {
      const data = [
        { x: 1000, y: 10 },
        { x: 2000, y: 20 },
        { x: 3000, y: 30 },
      ]
      expect(calculateCentralTendency(data, 'average')).toBe(20)
    })

    it('should calculate median of chart data', () => {
      const data = [
        { x: 1000, y: 10 },
        { x: 2000, y: 50 },
        { x: 3000, y: 30 },
      ]
      expect(calculateCentralTendency(data, 'median')).toBe(30)
    })

    it('should return 0 for empty data', () => {
      expect(calculateCentralTendency([], 'average')).toBe(0)
      expect(calculateCentralTendency([], 'median')).toBe(0)
    })
  })

  describe('calculateYAxisMax', () => {
    it('should round to nice numbers without limit', () => {
      const data = [
        { x: 1, y: 80 },
        { x: 2, y: 100 },
        { x: 3, y: 60 },
      ]
      expect(calculateYAxisMax(data, 1.25)).toBe(150)
    })

    it('should show limit with padding when data is at or below limit', () => {
      const data = [
        { x: 1, y: 80 },
        { x: 2, y: 100 },
        { x: 3, y: 60 },
      ]
      expect(calculateYAxisMax(data, 1.25, 100)).toBe(110)
    })

    it('should apply limit padding when data exceeds limit', () => {
      const data = [
        { x: 1, y: 120 },
        { x: 2, y: 140 },
        { x: 3, y: 130 },
      ]
      expect(calculateYAxisMax(data, 1.25, 100)).toBe(200)
    })

    it('should use custom scale factor', () => {
      const data = [{ x: 1, y: 100 }]
      expect(calculateYAxisMax(data, 1.5)).toBe(150)
    })

    it('should apply padding for empty data with limit', () => {
      const data: Array<{ x: number; y: number }> = []
      expect(calculateYAxisMax(data, 1.25, 100)).toBe(110)
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
        { timestamp: 1000, concurrentSandboxes: 10, sandboxStartRate: null },
        { timestamp: 2000, concurrentSandboxes: null, sandboxStartRate: 1.0 },
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
