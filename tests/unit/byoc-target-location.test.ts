import { describe, expect, it } from 'vitest'
import type {
  CloudConnection,
  Deployment,
} from '@/core/modules/byoc-deployments/repository.server'
import {
  resolvedTargetLocation,
  targetLocationChangeLocked,
} from '@/features/dashboard/byoc/target-location'

describe('BYOC target location state', () => {
  it('allows changes only before a connection or live deployment exists', () => {
    expect(targetLocationChangeLocked([], [])).toBe(false)
    expect(targetLocationChangeLocked([{} as CloudConnection], [])).toBe(true)
    expect(
      targetLocationChangeLocked([], [{ status: 'draft' } as Deployment])
    ).toBe(true)
    expect(
      targetLocationChangeLocked([], [{ status: 'destroyed' } as Deployment])
    ).toBe(false)
  })

  it('stays locked until both dependency queries are loaded', () => {
    expect(targetLocationChangeLocked(undefined, [])).toBe(true)
    expect(targetLocationChangeLocked([], undefined)).toBe(true)
  })

  it('treats refreshed allocated state as authoritative across tabs', () => {
    const staleSelection = { region: 'us-central1', zone: 'us-central1-a' }
    const refreshedTarget = { region: 'us-west1', zone: 'us-west1-a' }

    expect(
      resolvedTargetLocation(undefined, staleSelection, refreshedTarget, true)
    ).toEqual(refreshedTarget)
    expect(
      resolvedTargetLocation(undefined, staleSelection, undefined, false)
    ).toEqual(staleSelection)
  })
})
