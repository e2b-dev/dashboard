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
import type { SandboxDetailsDTO } from '@/server/api/models/sandboxes.models'

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
    it('should clamp lifecycle anchor end to now for paused sandbox', () => {
      const now = 1_700_000_000_000
      const sandboxInfo: SandboxDetailsDTO = {
        templateID: 'template-id',
        sandboxID: 'sandbox-id',
        startedAt: new Date(now - 60_000).toISOString(),
        endAt: new Date(now + 60_000).toISOString(),
        envdVersion: '1.0.0',
        cpuCount: 2,
        memoryMB: 512,
        diskSizeMB: 1_024,
        state: 'paused',
      }

      const bounds = getSandboxLifecycleBounds(sandboxInfo, now)

      expect(bounds?.startMs).toBe(now - 60_000)
      expect(bounds?.anchorEndMs).toBe(now)
      expect(bounds?.isRunning).toBe(false)
    })

    it('should fall back to now for running sandbox without endAt', () => {
      const now = 1_700_000_000_000
      const sandboxInfo = {
        startedAt: new Date(now - 60_000).toISOString(),
        endAt: null,
        state: 'running' as const,
      }

      const bounds = getSandboxLifecycleBounds(sandboxInfo, now)

      expect(bounds?.startMs).toBe(now - 60_000)
      expect(bounds?.anchorEndMs).toBe(now)
      expect(bounds?.isRunning).toBe(true)
    })

    it('should use stoppedAt when endAt is null for killed sandbox', () => {
      const now = 1_700_000_000_000
      const stoppedAt = now - 30_000
      const sandboxInfo: SandboxDetailsDTO = {
        templateID: 'template-id',
        sandboxID: 'sandbox-id',
        startedAt: new Date(now - 60_000).toISOString(),
        endAt: null,
        stoppedAt: new Date(stoppedAt).toISOString(),
        cpuCount: 2,
        memoryMB: 512,
        diskSizeMB: 1_024,
        state: 'killed',
      }

      const bounds = getSandboxLifecycleBounds(sandboxInfo, now)

      expect(bounds?.startMs).toBe(now - 60_000)
      expect(bounds?.anchorEndMs).toBe(stoppedAt)
      expect(bounds?.isRunning).toBe(false)
    })

    it('should fall back to now for killed sandbox without end timestamp', () => {
      const now = 1_700_000_000_000
      const sandboxInfo: SandboxDetailsDTO = {
        templateID: 'template-id',
        sandboxID: 'sandbox-id',
        startedAt: new Date(now - 60_000).toISOString(),
        endAt: null,
        stoppedAt: null,
        cpuCount: 2,
        memoryMB: 512,
        diskSizeMB: 1_024,
        state: 'killed',
      }

      const bounds = getSandboxLifecycleBounds(sandboxInfo, now)

      expect(bounds?.startMs).toBe(now - 60_000)
      expect(bounds?.anchorEndMs).toBe(now)
      expect(bounds?.isRunning).toBe(false)
    })
  })
})
