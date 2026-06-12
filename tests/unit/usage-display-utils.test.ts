import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatAxisDate,
  formatHoveredValues,
} from '@/features/dashboard/usage/display-utils'
import { requireTimezone } from './helpers/timezone'

describe('usage display utilities', () => {
  const newYork = requireTimezone('America/New_York')
  const losAngeles = requireTimezone('America/Los_Angeles')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T16:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats hourly axis labels in the selected timezone', () => {
    const timestamp = Date.UTC(2026, 5, 8, 13, 0, 0)

    expect(formatAxisDate(timestamp, 'hourly', newYork)).toContain('9 AM')
    expect(formatAxisDate(timestamp, 'hourly', losAngeles)).toContain('6 AM')
  })

  it('formats hover timestamps in the selected timezone', () => {
    const timestamp = Date.UTC(2026, 5, 8, 13, 0, 0)
    const timeframe = {
      start: timestamp,
      end: timestamp + 60 * 60 * 1000,
    }

    expect(
      formatHoveredValues(1, 2, 3, 4, timestamp, timeframe, newYork).sandboxes
        .timestamp
    ).toBe('Jun 8, 9am')
    expect(
      formatHoveredValues(1, 2, 3, 4, timestamp, timeframe, losAngeles)
        .sandboxes.timestamp
    ).toBe('Jun 8, 6am')
  })

  it('formats partial daily edge buckets using the actual range boundary hour', () => {
    const timeframe = {
      start: Date.UTC(2026, 5, 1, 13, 0, 0),
      end: Date.UTC(2026, 5, 8, 15, 0, 0),
    }
    const startBucket = Date.UTC(2026, 5, 1, 4, 0, 0)
    const endBucket = Date.UTC(2026, 5, 8, 4, 0, 0)

    expect(
      formatHoveredValues(1, 2, 3, 4, startBucket, timeframe, newYork).sandboxes
        .timestamp
    ).toBe('Jun 1, 9am - end of Jun 1')
    expect(
      formatHoveredValues(1, 2, 3, 4, endBucket, timeframe, newYork).sandboxes
        .timestamp
    ).toBe('Jun 8 - Jun 8, 11am')
  })
})
