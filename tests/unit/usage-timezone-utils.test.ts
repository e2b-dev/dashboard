import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TimezoneSchema,
  UTC_TIMEZONE,
} from '@/features/dashboard/timezone/schema'
import { getUsageTimeRangePresets } from '@/features/dashboard/usage/constants'
import {
  isBillingTimezoneBannerVisible,
  reanchorTimeframeToTimezone,
  resolveUsageTimezone,
} from '@/features/dashboard/usage/usage-timezone-utils'

const prague = TimezoneSchema.parse('Europe/Prague')
const tokyo = TimezoneSchema.parse('Asia/Tokyo')

const getPresetRange = (
  timezone: typeof prague,
  presetId: string
): { start: number; end: number } => {
  const preset = getUsageTimeRangePresets(timezone).find(
    (option) => option.id === presetId
  )
  if (!preset) throw new Error(`Expected ${presetId} preset to exist`)

  return preset.getValue()
}

describe('resolveUsageTimezone', () => {
  it('returns the user timezone when not pinned to UTC', () => {
    expect(resolveUsageTimezone(prague, false)).toBe(prague)
    expect(resolveUsageTimezone(UTC_TIMEZONE, false)).toBe(UTC_TIMEZONE)
  })

  it('returns UTC when pinned', () => {
    expect(resolveUsageTimezone(prague, true)).toBe(UTC_TIMEZONE)
    expect(resolveUsageTimezone(UTC_TIMEZONE, true)).toBe(UTC_TIMEZONE)
  })
})

describe('isBillingTimezoneBannerVisible', () => {
  it('shows the banner for non-UTC user timezones', () => {
    expect(isBillingTimezoneBannerVisible(prague)).toBe(true)
  })

  it('hides the banner when the user timezone is already UTC', () => {
    expect(isBillingTimezoneBannerVisible(UTC_TIMEZONE)).toBe(false)
  })
})

describe('reanchorTimeframeToTimezone', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const reanchorOrThrow = (
    ...args: Parameters<typeof reanchorTimeframeToTimezone>
  ) => {
    const reanchored = reanchorTimeframeToTimezone(...args)
    if (!reanchored) throw new Error('Expected timeframe to re-anchor')

    return reanchored
  }

  it('re-anchors a preset-aligned range to the target timezone boundaries', () => {
    const pragueThisMonth = getPresetRange(prague, 'this-month')

    const reanchored = reanchorOrThrow(pragueThisMonth, prague, UTC_TIMEZONE)

    expect(reanchored).toEqual(getPresetRange(UTC_TIMEZONE, 'this-month'))
    // Prague is UTC+2 in July, so the UTC month starts 2 hours later.
    expect(reanchored.start - pragueThisMonth.start).toBe(2 * 60 * 60 * 1000)
  })

  it('round-trips back to the original boundaries', () => {
    const pragueThisMonth = getPresetRange(prague, 'this-month')
    const utcThisMonth = reanchorOrThrow(pragueThisMonth, prague, UTC_TIMEZONE)

    expect(
      reanchorTimeframeToTimezone(utcThisMonth, UTC_TIMEZONE, prague)
    ).toEqual(pragueThisMonth)
  })

  it('returns null for custom ranges so they are kept as picked', () => {
    const twoWeeks = 14 * 24 * 60 * 60 * 1000
    const customEnd = new Date('2026-06-20T13:37:00.000Z').getTime()

    expect(
      reanchorTimeframeToTimezone(
        { start: customEnd - twoWeeks, end: customEnd },
        prague,
        UTC_TIMEZONE
      )
    ).toBeNull()
  })

  // Near month ends "this-month" also falls within the loose match tolerance
  // of "last-30-days"; the exact preset must win or a day of usage would be
  // dropped from the re-anchored range.
  it.each([
    '2026-07-30T10:00:00.000Z',
    '2026-07-31T10:00:00.000Z',
  ])('keeps "this-month" boundaries when re-anchoring at %s', (systemTime) => {
    vi.setSystemTime(new Date(systemTime))

    const pragueThisMonth = getPresetRange(prague, 'this-month')

    expect(reanchorOrThrow(pragueThisMonth, prague, UTC_TIMEZONE)).toEqual(
      getPresetRange(UTC_TIMEZONE, 'this-month')
    )
  })

  // On the 30th of a 30-day month "this-month" and "last-30-days" are
  // identical, so the match is a pure tie; the calendar preset must win. With
  // Tokyo a calendar day ahead of UTC, guessing "last-30-days" would re-anchor
  // to UTC May 31 - Jun 29 instead of the June billing month.
  it('resolves identical-range ties to the calendar preset', () => {
    // Tokyo 2026-06-30 00:30, UTC date still June 29.
    vi.setSystemTime(new Date('2026-06-29T15:30:00.000Z'))

    const tokyoThisMonth = getPresetRange(tokyo, 'this-month')
    expect(tokyoThisMonth).toEqual(getPresetRange(tokyo, 'last-30-days'))

    expect(reanchorOrThrow(tokyoThisMonth, tokyo, UTC_TIMEZONE)).toEqual(
      getPresetRange(UTC_TIMEZONE, 'this-month')
    )
  })

  it('round-trips "this-month" on the last day of a 31-day month', () => {
    vi.setSystemTime(new Date('2026-07-31T10:00:00.000Z'))

    const pragueThisMonth = getPresetRange(prague, 'this-month')
    const utcThisMonth = reanchorOrThrow(pragueThisMonth, prague, UTC_TIMEZONE)

    expect(
      reanchorTimeframeToTimezone(utcThisMonth, UTC_TIMEZONE, prague)
    ).toEqual(pragueThisMonth)
  })
})
