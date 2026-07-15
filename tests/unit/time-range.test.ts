import { describe, expect, it } from 'vitest'
import { findMatchingPreset } from '@/lib/utils/time-range'
import type { TimeRangePreset } from '@/ui/time-range-presets'

const DAY_MS = 24 * 60 * 60 * 1000

const makePreset = (
  id: string,
  start: number,
  end: number
): TimeRangePreset => ({
  id,
  label: id,
  getValue: () => ({ start, end }),
})

describe('findMatchingPreset', () => {
  it('matches a preset within tolerance', () => {
    const presets = [makePreset('a', 0, 10 * DAY_MS)]

    expect(findMatchingPreset(presets, 1000, 10 * DAY_MS - 1000, 5000)).toBe(
      'a'
    )
  })

  it('returns undefined when no preset is within tolerance', () => {
    const presets = [makePreset('a', 0, 10 * DAY_MS)]

    expect(
      findMatchingPreset(presets, 2 * DAY_MS, 12 * DAY_MS, 5000)
    ).toBeUndefined()
  })

  it('prefers the closest preset over an earlier loose overlap', () => {
    const exact = { start: 0, end: 31 * DAY_MS }
    const presets = [
      makePreset('loose', exact.start + DAY_MS, exact.end),
      makePreset('exact', exact.start, exact.end),
    ]

    expect(findMatchingPreset(presets, exact.start, exact.end, DAY_MS)).toBe(
      'exact'
    )
  })

  it('breaks deviation ties by preset order', () => {
    const presets = [
      makePreset('first', 0, 10 * DAY_MS),
      makePreset('second', 0, 10 * DAY_MS),
    ]

    expect(findMatchingPreset(presets, 0, 10 * DAY_MS, DAY_MS)).toBe('first')
  })
})
