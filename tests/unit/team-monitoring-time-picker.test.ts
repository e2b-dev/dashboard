import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatTimeframeValues } from '@/features/dashboard/sandboxes/monitoring/time-picker/utils'
import { createCustomTimeFormSchema } from '@/features/dashboard/sandboxes/monitoring/time-picker/validation'
import { parseTimezone, type Timezone } from '@/features/dashboard/timezone'

const requireTimezone = (value: string): Timezone => {
  const timezone = parseTimezone(value)
  if (!timezone) throw new Error(`Expected ${value} to be a valid timezone`)

  return timezone
}

describe('team monitoring time picker', () => {
  const newYork = requireTimezone('America/New_York')
  const losAngeles = requireTimezone('America/Los_Angeles')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T16:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats static timeframe values in the selected timezone', () => {
    const value = {
      mode: 'static' as const,
      start: Date.UTC(2026, 5, 10, 13, 0, 0),
      end: Date.UTC(2026, 5, 10, 14, 0, 0),
    }

    expect(formatTimeframeValues(value, newYork)).toEqual({
      startDateTime: '2026/06/10 09:00:00',
      endDateTime: '2026/06/10 10:00:00',
    })
    expect(formatTimeframeValues(value, losAngeles)).toEqual({
      startDateTime: '2026/06/10 06:00:00',
      endDateTime: '2026/06/10 07:00:00',
    })
  })

  it('validates custom wall-clock input in the selected timezone', () => {
    const schema = createCustomTimeFormSchema(newYork)

    const result = schema.safeParse({
      startDate: '2026/06/10',
      startTime: '09:00:00',
      endDate: '2026/06/10',
      endTime: '10:00:00',
      endEnabled: true,
    })

    expect(result.success).toBe(true)
  })
})
