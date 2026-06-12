import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatTimezoneLabel,
  getBrowserTimezone,
  getTimezones,
  isValidTimezone,
  parseTimezone,
} from '@/features/dashboard/timezone/utils'

describe('timezone utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isValidTimezone', () => {
    it('accepts valid IANA timezones and UTC', () => {
      expect(isValidTimezone('America/New_York')).toBe(true)
      expect(isValidTimezone('Europe/Berlin')).toBe(true)
      expect(isValidTimezone('UTC')).toBe(true)
    })

    it('rejects invalid timezone values', () => {
      expect(isValidTimezone('not-a-timezone')).toBe(false)
      expect(isValidTimezone('')).toBe(false)
    })
  })

  describe('parseTimezone', () => {
    it('returns the timezone when it is valid', () => {
      expect(parseTimezone('America/New_York')).toBe('America/New_York')
    })

    it('returns null for missing or invalid timezone values', () => {
      expect(parseTimezone(null)).toBeNull()
      expect(parseTimezone(undefined)).toBeNull()
      expect(parseTimezone('not-a-timezone')).toBeNull()
    })
  })

  describe('getTimezones', () => {
    it('returns valid timezone options', () => {
      const options = getTimezones()

      expect(options.length).toBeGreaterThan(0)
      expect(options.every(isValidTimezone)).toBe(true)
    })

    it('includes the browser timezone', () => {
      const options = getTimezones()

      expect(options).toContain(getBrowserTimezone())
    })

    it('includes UTC even when Intl.supportedValuesOf omits it', () => {
      const options = getTimezones()

      expect(options).toContain('UTC')
    })
  })

  describe('formatTimezoneLabel', () => {
    it('includes the timezone and its short display name', () => {
      const timezone = parseTimezone('America/New_York')
      if (!timezone) throw new Error('Expected valid timezone')

      const label = formatTimezoneLabel(timezone)

      expect(label).toContain('America/New York')
      expect(label).toContain('EST')
    })

    it('replaces underscores with spaces for display', () => {
      const timezone = parseTimezone('Africa/Addis_Ababa')
      if (!timezone) throw new Error('Expected valid timezone')

      expect(formatTimezoneLabel(timezone)).toContain('Africa/Addis Ababa')
    })
  })
})
