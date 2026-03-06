import { describe, expect, it } from 'vitest'
import {
  SANDBOX_MONITORING_DEFAULT_RANGE_MS,
  SANDBOX_MONITORING_MAX_RANGE_MS,
  SANDBOX_MONITORING_MIN_RANGE_MS,
} from '@/features/dashboard/sandbox/monitoring/utils/constants'
import {
  getSandboxLifecycleBounds,
  normalizeMonitoringTimeframe,
  parseMonitoringQueryState,
} from '@/features/dashboard/sandbox/monitoring/utils/timeframe'

describe('sandbox-monitoring-timeframe', () => {
  describe('normalizeMonitoringTimeframe', () => {
    it('should fallback to default range when inputs are invalid', () => {
      const now = 1_700_000_000_000

      const result = normalizeMonitoringTimeframe({
        start: Number.NaN,
        end: Number.POSITIVE_INFINITY,
        now,
      })

      expect(result.end).toBe(now)
      expect(result.start).toBe(now - SANDBOX_MONITORING_DEFAULT_RANGE_MS)
    })

    it('should enforce minimum range', () => {
      const now = 1_700_000_000_000

      const result = normalizeMonitoringTimeframe({
        start: now - 1_000,
        end: now,
        now,
      })

      expect(result.end - result.start).toBe(SANDBOX_MONITORING_MIN_RANGE_MS)
    })

    it('should cap maximum range', () => {
      const now = 1_700_000_000_000

      const result = normalizeMonitoringTimeframe({
        start: now - 365 * 24 * 60 * 60 * 1_000,
        end: now,
        now,
      })

      expect(result.end - result.start).toBe(SANDBOX_MONITORING_MAX_RANGE_MS)
    })

    it('should clamp future timestamps to now', () => {
      const now = 1_700_000_000_000

      const result = normalizeMonitoringTimeframe({
        start: now + 5_000,
        end: now + 10_000,
        now,
      })

      expect(result.end).toBe(now)
      expect(result.start).toBe(now - SANDBOX_MONITORING_MIN_RANGE_MS)
    })
  })

  describe('parseMonitoringQueryState', () => {
    it('should parse canonical query params', () => {
      const result = parseMonitoringQueryState({
        start: '1000',
        end: '2000',
        live: '1',
      })

      expect(result).toEqual({
        start: 1000,
        end: 2000,
        live: true,
      })
    })

    it('should reject non-canonical live values and invalid timestamps', () => {
      const result = parseMonitoringQueryState({
        start: '123abc',
        end: String(Number.MAX_SAFE_INTEGER),
        live: 'true',
      })

      expect(result).toEqual({
        start: null,
        end: null,
        live: null,
      })
    })
  })

  describe('getSandboxLifecycleBounds', () => {
    it('should use pausedAt for paused sandbox anchor end', () => {
      const now = 1_700_000_000_000
      const pausedAt = now - 30_000
      const sandboxLifecycle = {
        createdAt: new Date(now - 60_000).toISOString(),
        pausedAt: new Date(pausedAt).toISOString(),
        endedAt: null,
        state: 'paused' as const,
      }

      const bounds = getSandboxLifecycleBounds(sandboxLifecycle, now)

      expect(bounds?.startMs).toBe(now - 60_000)
      expect(bounds?.anchorEndMs).toBe(pausedAt)
      expect(bounds?.isRunning).toBe(false)
    })

    it('should fall back to now for running sandbox without endAt', () => {
      const now = 1_700_000_000_000
      const sandboxLifecycle = {
        createdAt: new Date(now - 60_000).toISOString(),
        pausedAt: null,
        endedAt: null,
        state: 'running' as const,
      }

      const bounds = getSandboxLifecycleBounds(sandboxLifecycle, now)

      expect(bounds?.startMs).toBe(now - 60_000)
      expect(bounds?.anchorEndMs).toBe(now)
      expect(bounds?.isRunning).toBe(true)
    })

    it('should use endedAt for killed sandbox', () => {
      const now = 1_700_000_000_000
      const endedAt = now - 30_000
      const sandboxLifecycle = {
        createdAt: new Date(now - 60_000).toISOString(),
        pausedAt: null,
        endedAt: new Date(endedAt).toISOString(),
        state: 'killed' as const,
      }

      const bounds = getSandboxLifecycleBounds(sandboxLifecycle, now)

      expect(bounds?.startMs).toBe(now - 60_000)
      expect(bounds?.anchorEndMs).toBe(endedAt)
      expect(bounds?.isRunning).toBe(false)
    })

    it('should fall back to now for paused sandbox without pausedAt', () => {
      const now = 1_700_000_000_000
      const sandboxLifecycle = {
        createdAt: new Date(now - 60_000).toISOString(),
        pausedAt: null,
        endedAt: null,
        state: 'paused' as const,
      }

      const bounds = getSandboxLifecycleBounds(sandboxLifecycle, now)

      expect(bounds?.startMs).toBe(now - 60_000)
      expect(bounds?.anchorEndMs).toBe(now)
      expect(bounds?.isRunning).toBe(false)
    })
  })
})
