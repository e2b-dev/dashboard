import { describe, expect, it } from 'vitest'
import { buildMonitoringChartModel } from '@/features/dashboard/sandbox/monitoring/utils/chart-model'
import type {
  SandboxEventDTO,
  SandboxMetric,
} from '@/server/api/models/sandboxes.models'

const baseMetric = {
  timestamp: '1970-01-01T00:00:00.000Z',
  cpuCount: 2,
  memTotal: 1_000,
  diskTotal: 2_000,
} satisfies Omit<
  SandboxMetric,
  'timestampUnix' | 'cpuUsedPct' | 'memUsed' | 'diskUsed'
>

function createLifecycleEvent(
  overrides: Partial<SandboxEventDTO> & Pick<SandboxEventDTO, 'id' | 'type'>
): SandboxEventDTO {
  return {
    id: overrides.id,
    version: 'v1',
    type: overrides.type,
    eventData: null,
    timestamp: overrides.timestamp ?? '1970-01-01T00:00:00.000Z',
    sandboxId: overrides.sandboxId ?? 'sandbox_1',
    sandboxExecutionId: overrides.sandboxExecutionId ?? 'execution_1',
    sandboxTemplateId: overrides.sandboxTemplateId ?? 'template_1',
    sandboxBuildId: overrides.sandboxBuildId ?? 'build_1',
    sandboxTeamId:
      overrides.sandboxTeamId ?? '00000000-0000-0000-0000-000000000001',
  }
}

describe('buildMonitoringChartModel', () => {
  it('builds deterministic time-series data sorted by timestamp', () => {
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
    })

    expect(result.resourceSeries).toHaveLength(2)
    expect(result.diskSeries).toHaveLength(1)
    expect(result.resourceSeries[0]?.data).toEqual([
      [0, 10, null],
      [5_000, 20, null],
      [10_000, 30, null],
    ])
    expect(result.resourceSeries[1]?.data).toEqual([
      [0, 10, 0],
      [5_000, 20, 0],
      [10_000, 30, 0],
    ])
    expect(result.diskSeries[0]?.data).toEqual([
      [0, 10, 0],
      [5_000, 20, 0],
      [10_000, 30, 0],
    ])
  })

  it('returns empty series when no data is available', () => {
    const result = buildMonitoringChartModel({
      metrics: [],
      startMs: 0,
      endMs: 10_000,
    })

    expect(result.resourceSeries[0]?.data).toEqual([])
    expect(result.diskSeries[0]?.data).toEqual([])
  })

  it('filters out metrics outside range and invalid timestamps', () => {
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
        timestampUnix: Number.NaN,
        cpuUsedPct: 55,
        memUsed: 550,
        diskUsed: 1_100,
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
    })

    expect(result.resourceSeries[0]?.data).toEqual([[1_000, 5, null]])
    expect(result.diskSeries[0]?.data).toEqual([[1_000, 5, 0]])
  })

  it('inserts null points across paused intervals to break line rendering', () => {
    const metrics: SandboxMetric[] = [
      {
        ...baseMetric,
        timestampUnix: 10,
        cpuUsedPct: 10,
        memUsed: 100,
        diskUsed: 200,
      },
      {
        ...baseMetric,
        timestampUnix: 50,
        cpuUsedPct: 50,
        memUsed: 500,
        diskUsed: 1_000,
      },
    ]

    const lifecycleEvents: SandboxEventDTO[] = [
      createLifecycleEvent({
        id: 'pause',
        type: 'sandbox.lifecycle.paused',
        timestamp: '1970-01-01T00:00:20.000Z',
      }),
      createLifecycleEvent({
        id: 'resume',
        type: 'sandbox.lifecycle.resumed',
        timestamp: '1970-01-01T00:00:40.000Z',
      }),
    ]

    const result = buildMonitoringChartModel({
      metrics,
      lifecycleEvents,
      startMs: 0,
      endMs: 60_000,
    })

    expect(result.resourceSeries[0]?.data).toEqual([
      [10_000, 10, null],
      [30_000, null, null],
      [50_000, 50, null],
    ])
    expect(result.resourceSeries[0]?.connectors).toEqual([
      {
        from: [10_000, 10],
        to: [20_000, 10],
      },
      {
        from: [40_000, 50],
        to: [50_000, 50],
      },
    ])
    expect(result.resourceSeries[1]?.data).toEqual([
      [10_000, 10, 0],
      [30_000, null, null],
      [50_000, 50, 0],
    ])
    expect(result.resourceSeries[1]?.connectors).toEqual([
      {
        from: [10_000, 10],
        to: [20_000, 10],
      },
      {
        from: [40_000, 50],
        to: [50_000, 50],
      },
    ])
    expect(result.diskSeries[0]?.data).toEqual([
      [10_000, 10, 0],
      [30_000, null, null],
      [50_000, 50, 0],
    ])
    expect(result.diskSeries[0]?.connectors).toEqual([
      {
        from: [10_000, 10],
        to: [20_000, 10],
      },
      {
        from: [40_000, 50],
        to: [50_000, 50],
      },
    ])
  })

  it('does not treat killed periods as paused gaps', () => {
    const metrics: SandboxMetric[] = [
      {
        ...baseMetric,
        timestampUnix: 10,
        cpuUsedPct: 10,
        memUsed: 100,
        diskUsed: 200,
      },
      {
        ...baseMetric,
        timestampUnix: 50,
        cpuUsedPct: 50,
        memUsed: 500,
        diskUsed: 1_000,
      },
    ]

    const lifecycleEvents: SandboxEventDTO[] = [
      createLifecycleEvent({
        id: 'pause-1',
        type: 'sandbox.lifecycle.paused',
        timestamp: '1970-01-01T00:00:20.000Z',
      }),
      createLifecycleEvent({
        id: 'kill-1',
        type: 'sandbox.lifecycle.killed',
        timestamp: '1970-01-01T00:00:40.000Z',
      }),
      createLifecycleEvent({
        id: 'kill-2',
        type: 'sandbox.lifecycle.killed',
        timestamp: '1970-01-01T00:00:45.000Z',
      }),
      createLifecycleEvent({
        id: 'resume',
        type: 'sandbox.lifecycle.resumed',
        timestamp: '1970-01-01T00:00:55.000Z',
      }),
    ]

    const result = buildMonitoringChartModel({
      metrics,
      lifecycleEvents,
      startMs: 0,
      endMs: 60_000,
    })

    expect(result.resourceSeries[0]?.data).toEqual([
      [10_000, 10, null],
      [50_000, null, null],
    ])
    expect(result.resourceSeries[0]?.connectors).toEqual([
      {
        from: [10_000, 10],
        to: [20_000, 10],
      },
    ])
  })

  it('builds visible lifecycle event markers for created, paused, resumed, and killed only', () => {
    const lifecycleEvents: SandboxEventDTO[] = [
      createLifecycleEvent({
        id: 'outside',
        type: 'sandbox.lifecycle.killed',
        timestamp: '1970-01-01T00:00:20.000Z',
      }),
      createLifecycleEvent({
        id: 'created',
        type: 'sandbox.lifecycle.created',
        timestamp: '1970-01-01T00:00:01.000Z',
      }),
      createLifecycleEvent({
        id: 'paused',
        type: 'sandbox.lifecycle.paused',
        timestamp: '1970-01-01T00:00:02.000Z',
      }),
      createLifecycleEvent({
        id: 'resumed',
        type: 'sandbox.lifecycle.resumed',
        timestamp: '1970-01-01T00:00:03.000Z',
      }),
      createLifecycleEvent({
        id: 'unknown',
        type: 'sandbox.lifecycle.custom_event',
        timestamp: '1970-01-01T00:00:04.000Z',
      }),
      createLifecycleEvent({
        id: 'updated',
        type: 'sandbox.lifecycle.updated',
        timestamp: '1970-01-01T00:00:04.500Z',
      }),
      createLifecycleEvent({
        id: 'killed',
        type: 'sandbox.lifecycle.killed',
        timestamp: '1970-01-01T00:00:04.800Z',
      }),
    ]

    const result = buildMonitoringChartModel({
      metrics: [],
      lifecycleEvents,
      startMs: 0,
      endMs: 5_000,
    })

    expect(result.resourceLifecycleEventMarkers).toEqual([
      {
        id: 'created',
        type: 'sandbox.lifecycle.created',
        label: 'Created',
        timestampMs: 1_000,
        colorVar: '--accent-positive-highlight',
      },
      {
        id: 'paused',
        type: 'sandbox.lifecycle.paused',
        label: 'Paused',
        timestampMs: 2_000,
        colorVar: '--accent-info-highlight',
      },
      {
        id: 'resumed',
        type: 'sandbox.lifecycle.resumed',
        label: 'Resumed',
        timestampMs: 3_000,
        colorVar: '--accent-info-highlight',
      },
      {
        id: 'killed',
        type: 'sandbox.lifecycle.killed',
        label: 'Killed',
        timestampMs: 4_800,
        colorVar: '--accent-error-highlight',
      },
    ])
  })
})
