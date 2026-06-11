import { describe, expect, it } from 'vitest'
import { parseTimezone, type Timezone } from '@/features/dashboard/timezone'
import {
  normalizeToEndOfSamplingPeriod,
  normalizeToStartOfSamplingPeriod,
  processUsageData,
} from '@/features/dashboard/usage/sampling-utils'

const requireTimezone = (value: string): Timezone => {
  const timezone = parseTimezone(value)
  if (!timezone) throw new Error(`Expected ${value} to be a valid timezone`)

  return timezone
}

describe('usage sampling utilities', () => {
  const newYork = requireTimezone('America/New_York')
  const losAngeles = requireTimezone('America/Los_Angeles')

  it('normalizes daily boundaries in the selected timezone', () => {
    const timestamp = Date.UTC(2026, 5, 10, 13, 0, 0)

    expect(
      new Date(
        normalizeToStartOfSamplingPeriod(timestamp, 'daily', newYork)
      ).toISOString()
    ).toBe('2026-06-10T04:00:00.000Z')
    expect(
      new Date(
        normalizeToStartOfSamplingPeriod(timestamp, 'daily', losAngeles)
      ).toISOString()
    ).toBe('2026-06-10T07:00:00.000Z')

    expect(
      new Date(
        normalizeToEndOfSamplingPeriod(timestamp, 'daily', newYork)
      ).toISOString()
    ).toBe('2026-06-11T03:59:59.999Z')
    expect(
      new Date(
        normalizeToEndOfSamplingPeriod(timestamp, 'daily', losAngeles)
      ).toISOString()
    ).toBe('2026-06-11T06:59:59.999Z')
  })

  it('normalizes weekly boundaries in the selected timezone', () => {
    const timestamp = Date.UTC(2026, 5, 10, 13, 0, 0)

    expect(
      new Date(
        normalizeToStartOfSamplingPeriod(timestamp, 'weekly', newYork)
      ).toISOString()
    ).toBe('2026-06-08T04:00:00.000Z')
    expect(
      new Date(
        normalizeToEndOfSamplingPeriod(timestamp, 'weekly', newYork)
      ).toISOString()
    ).toBe('2026-06-15T03:59:59.999Z')
  })

  it('aggregates daily data into selected-timezone bucket starts', () => {
    const timestamp = Date.UTC(2026, 5, 10, 13, 0, 0)
    const sampledData = processUsageData(
      [
        {
          timestamp,
          sandbox_count: 2,
          cpu_hours: 3,
          ram_gib_hours: 4,
          price_for_cpu: 5,
          price_for_ram: 6,
        },
      ],
      {
        start: Date.UTC(2026, 5, 1, 0, 0, 0),
        end: Date.UTC(2026, 5, 11, 0, 0, 0),
      },
      losAngeles
    )

    expect(sampledData).toEqual([
      {
        timestamp: Date.UTC(2026, 5, 10, 7, 0, 0),
        sandboxCount: 2,
        cost: 11,
        vcpuHours: 3,
        ramGibHours: 4,
      },
    ])
  })
})
