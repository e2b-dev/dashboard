import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatTimeframeValues,
  getCustomTimeCalendarBounds,
} from '@/features/dashboard/sandboxes/monitoring/time-picker/utils'
import { createCustomTimeFormSchema } from '@/features/dashboard/sandboxes/monitoring/time-picker/validation'
import { requireTimezone } from './helpers/timezone'

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

  it('aligns calendar bounds with the selected timezone near day boundaries', () => {
    const auckland = requireTimezone('Pacific/Auckland')

    const { minDate, maxDate } = getCustomTimeCalendarBounds(
      new Date('2026-06-08T13:00:00.000Z'),
      auckland
    )

    expect(minDate.getFullYear()).toBe(2026)
    expect(minDate.getMonth()).toBe(4)
    expect(minDate.getDate()).toBe(9)
    expect(maxDate.getFullYear()).toBe(2026)
    expect(maxDate.getMonth()).toBe(5)
    expect(maxDate.getDate()).toBe(9)
  })
})
