import { describe, expect, it } from 'vitest'
import { buildMonitoringChartModel } from '@/features/dashboard/sandbox/monitoring/utils/chart-model'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'

const baseMetric = {
  timestamp: '1970-01-01T00:00:00.000Z',
  cpuCount: 2,
  memTotal: 1_000,
  diskTotal: 2_000,
} satisfies Omit<
  SandboxMetric,
  'timestampUnix' | 'cpuUsedPct' | 'memUsed' | 'diskUsed'
>

describe('buildMonitoringChartModel', () => {
  it('should build deterministic chart data and hovered contexts', () => {
    const metrics: SandboxMetric[] = [
      {
        ...baseMetric,
        timestampUnix: 10,
        cpuUsedPct: 30,
        memUsed: 300,
        diskUsed: 600,
      },
      {
        ...baseMetric,
        timestampUnix: 0,
        cpuUsedPct: 10,
        memUsed: 100,
        diskUsed: 200,
      },
      {
        ...baseMetric,
        timestampUnix: 5,
        cpuUsedPct: 20,
        memUsed: 200,
        diskUsed: 400,
      },
    ]

    const result = buildMonitoringChartModel({
      metrics,
      startMs: 0,
      endMs: 10_000,
      hoveredIndex: 1,
    })

    expect(result.categories).toEqual([0, 5_000, 10_000])
    expect(result.latestMetric?.timestampUnix).toBe(10)
    expect(result.resourceSeries).toHaveLength(2)
    expect(result.diskSeries).toHaveLength(1)
    expect(result.resourceHoveredContext).toEqual({
      cpuPercent: 20,
      ramPercent: 20,
      timestampMs: 5_000,
    })
    expect(result.diskHoveredContext).toEqual({
      diskPercent: 20,
      timestampMs: 5_000,
    })
  })

  it('should return null hovered contexts when hovered index is invalid', () => {
    const metrics: SandboxMetric[] = [
      {
        ...baseMetric,
        timestampUnix: 1,
        cpuUsedPct: 10,
        memUsed: 100,
        diskUsed: 200,
      },
    ]

    const result = buildMonitoringChartModel({
      metrics,
      startMs: 0,
      endMs: 10_000,
      hoveredIndex: 10,
    })

    expect(result.resourceHoveredContext).toBeNull()
    expect(result.diskHoveredContext).toBeNull()
  })

  it('should ignore metrics outside selected timeframe', () => {
    const metrics: SandboxMetric[] = [
      {
        ...baseMetric,
        timestampUnix: 1,
        cpuUsedPct: 5,
        memUsed: 50,
        diskUsed: 100,
      },
      {
        ...baseMetric,
        timestampUnix: 20,
        cpuUsedPct: 80,
        memUsed: 800,
        diskUsed: 1_600,
      },
    ]

    const result = buildMonitoringChartModel({
      metrics,
      startMs: 0,
      endMs: 10_000,
      hoveredIndex: null,
    })

    expect(result.latestMetric?.timestampUnix).toBe(1)
  })
})
