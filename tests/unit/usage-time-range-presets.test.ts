import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatZonedDateTimeInput,
  parseTimezone,
  type Timezone,
} from '@/features/dashboard/timezone'
import { getUsageTimeRangePresets } from '@/features/dashboard/usage/constants'

const requireTimezone = (value: string): Timezone => {
  const timezone = parseTimezone(value)
  if (!timezone) throw new Error(`Expected ${value} to be a valid timezone`)

  return timezone
}

const getPresetRange = (timezone: Timezone, presetId: string) => {
  const preset = getUsageTimeRangePresets(timezone).find(
    (option) => option.id === presetId
  )
  if (!preset) throw new Error(`Expected ${presetId} preset to exist`)

  return preset.getValue()
}

describe('usage time range presets', () => {
  const newYork = requireTimezone('America/New_York')
  const losAngeles = requireTimezone('America/Los_Angeles')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T16:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('computes last 90 days from midnight to end of day in the selected timezone', () => {
    const newYorkRange = getPresetRange(newYork, 'last-90-days')
    const losAngelesRange = getPresetRange(losAngeles, 'last-90-days')

    expect(formatZonedDateTimeInput(newYorkRange.start, newYork)).toEqual({
      date: '2026/03/13',
      time: '00:00:00',
    })
    expect(formatZonedDateTimeInput(newYorkRange.end, newYork)).toEqual({
      date: '2026/06/10',
      time: '23:59:59',
    })

    expect(formatZonedDateTimeInput(losAngelesRange.start, losAngeles)).toEqual(
      {
        date: '2026/03/13',
        time: '00:00:00',
      }
    )
    expect(formatZonedDateTimeInput(losAngelesRange.end, losAngeles)).toEqual({
      date: '2026/06/10',
      time: '23:59:59',
    })
  })
})
