import { describe, expect, it } from 'vitest'
import {
  deriveSandboxLifecycleFromEvents,
  type SandboxEventModel,
} from '@/core/domains/sandboxes/models'

function createLifecycleEvent(
  overrides: Partial<SandboxEventModel> & Pick<SandboxEventModel, 'id' | 'type'>
): SandboxEventModel {
  return {
    id: overrides.id,
    version: 'v1',
    type: overrides.type,
    eventData: null,
    timestamp: overrides.timestamp ?? '2026-03-06T19:00:00.000Z',
    sandboxId: overrides.sandboxId ?? 'sandbox_1',
    sandboxExecutionId: overrides.sandboxExecutionId ?? 'execution_1',
    sandboxTemplateId: overrides.sandboxTemplateId ?? 'template_1',
    sandboxBuildId: overrides.sandboxBuildId ?? 'build_1',
    sandboxTeamId:
      overrides.sandboxTeamId ?? '00000000-0000-0000-0000-000000000001',
  }
}

describe('deriveSandboxLifecycleFromEvents', () => {
  it('derives createdAt, pausedAt and endedAt from a full lifecycle', () => {
    const events: SandboxEventModel[] = [
      createLifecycleEvent({
        id: '5',
        type: 'sandbox.lifecycle.killed',
        timestamp: '2026-03-06T19:22:44.283Z',
      }),
      createLifecycleEvent({
        id: '1',
        type: 'sandbox.lifecycle.created',
        timestamp: '2026-03-06T19:21:40.299Z',
      }),
      createLifecycleEvent({
        id: '4',
        type: 'sandbox.lifecycle.resumed',
        timestamp: '2026-03-06T19:22:21.447Z',
      }),
      createLifecycleEvent({
        id: '3',
        type: 'sandbox.lifecycle.paused',
        timestamp: '2026-03-06T19:22:11.004Z',
      }),
      createLifecycleEvent({
        id: '2',
        type: 'sandbox.lifecycle.updated',
        timestamp: '2026-03-06T19:22:10.409Z',
      }),
    ]

    const lifecycle = deriveSandboxLifecycleFromEvents(events)

    expect(lifecycle.createdAt).toBe('2026-03-06T19:21:40.299Z')
    expect(lifecycle.pausedAt).toBeNull()
    expect(lifecycle.endedAt).toBe('2026-03-06T19:22:44.283Z')
    expect(lifecycle.events).toHaveLength(5)
    expect(lifecycle.events.map((event) => event.type)).toEqual([
      'sandbox.lifecycle.created',
      'sandbox.lifecycle.updated',
      'sandbox.lifecycle.paused',
      'sandbox.lifecycle.resumed',
      'sandbox.lifecycle.killed',
    ])
  })

  it('keeps pausedAt when the sandbox is paused and not resumed yet', () => {
    const events: SandboxEventModel[] = [
      createLifecycleEvent({
        id: '1',
        type: 'sandbox.lifecycle.created',
        timestamp: '2026-03-06T19:21:40.299Z',
      }),
      createLifecycleEvent({
        id: '2',
        type: 'sandbox.lifecycle.paused',
        timestamp: '2026-03-06T19:22:11.004Z',
      }),
    ]

    const lifecycle = deriveSandboxLifecycleFromEvents(events)

    expect(lifecycle.createdAt).toBe('2026-03-06T19:21:40.299Z')
    expect(lifecycle.pausedAt).toBe('2026-03-06T19:22:11.004Z')
    expect(lifecycle.endedAt).toBeNull()
  })

  it('uses first created event and latest killed event', () => {
    const events: SandboxEventModel[] = [
      createLifecycleEvent({
        id: '1',
        type: 'sandbox.lifecycle.created',
        timestamp: '2026-03-06T19:00:00.000Z',
      }),
      createLifecycleEvent({
        id: '2',
        type: 'sandbox.lifecycle.created',
        timestamp: '2026-03-06T19:05:00.000Z',
      }),
      createLifecycleEvent({
        id: '3',
        type: 'sandbox.lifecycle.killed',
        timestamp: '2026-03-06T19:10:00.000Z',
      }),
      createLifecycleEvent({
        id: '4',
        type: 'sandbox.lifecycle.killed',
        timestamp: '2026-03-06T19:15:00.000Z',
      }),
    ]

    const lifecycle = deriveSandboxLifecycleFromEvents(events)

    expect(lifecycle.createdAt).toBe('2026-03-06T19:00:00.000Z')
    expect(lifecycle.endedAt).toBe('2026-03-06T19:15:00.000Z')
  })

  it('ignores non-lifecycle events', () => {
    const events: SandboxEventModel[] = [
      createLifecycleEvent({
        id: '1',
        type: 'sandbox.lifecycle.created',
      }),
      createLifecycleEvent({
        id: '2',
        type: 'sandbox.process.started',
      }),
      createLifecycleEvent({
        id: '3',
        type: 'sandbox.request.timeout',
      }),
    ]

    const lifecycle = deriveSandboxLifecycleFromEvents(events)

    expect(lifecycle.events).toHaveLength(1)
    expect(lifecycle.events[0]?.type).toBe('sandbox.lifecycle.created')
  })
})
