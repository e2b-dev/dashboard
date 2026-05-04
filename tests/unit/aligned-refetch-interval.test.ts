import { describe, expect, it } from 'vitest'
import { getMsUntilNextAlignedInterval } from '@/lib/hooks/use-aligned-refetch-interval'

describe('getMsUntilNextAlignedInterval', () => {
  it('returns remaining milliseconds until next boundary', () => {
    expect(getMsUntilNextAlignedInterval(5_000, 12_345)).toBe(2_655)
  })

  it('returns full interval when already on boundary', () => {
    expect(getMsUntilNextAlignedInterval(5_000, 15_000)).toBe(5_000)
  })

  it('returns zero for invalid interval values', () => {
    expect(getMsUntilNextAlignedInterval(0, 15_000)).toBe(0)
    expect(getMsUntilNextAlignedInterval(Number.NaN, 15_000)).toBe(0)
  })
})
