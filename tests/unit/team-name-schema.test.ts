import { describe, expect, it } from 'vitest'
import { TeamNameSchema } from '@/core/modules/teams/schemas'

describe('TeamNameSchema', () => {
  it('accepts provisioning-generated default names with apostrophes', () => {
    expect(TeamNameSchema.safeParse("Jakub's Project").success).toBe(true)
    expect(TeamNameSchema.safeParse('Personal Project').success).toBe(true)
  })

  it('still rejects malformed names', () => {
    expect(TeamNameSchema.safeParse('').success).toBe(false)
    expect(TeamNameSchema.safeParse("'leading apostrophe").success).toBe(false)
    expect(TeamNameSchema.safeParse("trailing'").success).toBe(false)
    expect(TeamNameSchema.safeParse('bad!chars').success).toBe(false)
    expect(TeamNameSchema.safeParse('a'.repeat(33)).success).toBe(false)
  })
})
