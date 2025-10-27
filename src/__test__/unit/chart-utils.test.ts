import { transformMetrics } from '@/features/dashboard/sandboxes/monitoring/charts/team-metrics-chart/utils'
import { calculateYAxisMax } from '@/lib/utils/chart'
import { ClientTeamMetric } from '@/types/sandboxes.types'
import { describe, expect, it } from 'vitest'

describe('team-metrics-chart-utils', () => {
  describe('calculateYAxisMax', () => {
    it('should round to nice numbers based on data', () => {
      const data = [
        { x: 1, y: 80 },
        { x: 2, y: 100 },
        { x: 3, y: 60 },
      ]
      // max = 100, scale = 1.25 → 125 → snap to 150
      expect(calculateYAxisMax(data, 1.25)).toBe(150)
    })

    it('should use custom scale factor', () => {
      const data = [{ x: 1, y: 100 }]
      // max = 100, scale = 1.5 → 150
      expect(calculateYAxisMax(data, 1.5)).toBe(150)
    })

    it('should snap to nice values for different ranges', () => {
      // small values < 10
      expect(calculateYAxisMax([{ x: 1, y: 5 }], 1.5)).toBe(8) // 7.5 → ceil to 8

      // values 10-100
      expect(calculateYAxisMax([{ x: 1, y: 50 }], 1.5)).toBe(80) // 75 → snap to 80

      // values 100-1000
      expect(calculateYAxisMax([{ x: 1, y: 500 }], 1.5)).toBe(750) // 750 → snap to 750
    })

    it('should return default for empty data', () => {
      const data: Array<{ x: number; y: number }> = []
      expect(calculateYAxisMax(data, 1.25)).toBe(1)
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
