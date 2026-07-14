import { describe, expect, it } from 'vitest'
import type {
  CloudConnection,
  Deployment,
} from '@/core/modules/byoc-deployments/repository.server'
import { targetLocationChangeLocked } from '@/features/dashboard/byoc/target-location'

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
})
