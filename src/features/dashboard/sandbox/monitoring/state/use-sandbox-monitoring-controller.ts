'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import { useSandboxContext } from '@/features/dashboard/sandbox/context'
import { getMsUntilNextAlignedInterval } from '@/lib/hooks/use-aligned-refetch-interval'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { useTRPCClient } from '@/trpc/client'
import {
  SANDBOX_LIFECYCLE_EVENT_KILLED,
  SANDBOX_MONITORING_DEFAULT_PRESET_ID,
  SANDBOX_MONITORING_DEFAULT_RANGE_MS,
  SANDBOX_MONITORING_LIFECYCLE_PADDING_MS,
  SANDBOX_MONITORING_LIVE_POLLING_MS,
  SANDBOX_MONITORING_MAX_RANGE_MS,
  SANDBOX_MONITORING_MIN_RANGE_MS,
} from '../utils/constants'
import {
  findPresetById,
  getMonitoringPresets,
  isLiveEligiblePreset,
} from '../utils/presets'
import {
  clampTimeframeToBounds,
  getSandboxLifecycleBounds,
  normalizeMonitoringTimeframe,
  type SandboxLifecycleBounds,
} from '../utils/timeframe'

interface SandboxMonitoringTimeframe {
  start: number
  end: number
}

const monitoringUrlParams = {
  start: parseAsInteger,
  end: parseAsInteger,
  preset: parseAsString,
}

function resolveTimeframe(
  start: number,
  end: number,
  now: number,
  lifecycleBounds: SandboxLifecycleBounds | null
): SandboxMonitoringTimeframe {
  const normalized = normalizeMonitoringTimeframe({
    start,
    end,
    now: now + SANDBOX_MONITORING_LIFECYCLE_PADDING_MS,
    minRangeMs: SANDBOX_MONITORING_MIN_RANGE_MS,
    maxRangeMs: SANDBOX_MONITORING_MAX_RANGE_MS,
  })

  if (!lifecycleBounds) {
    return { start: normalized.start, end: normalized.end }
  }

  const maxBoundMs = lifecycleBounds.isRunning
    ? now
    : lifecycleBounds.anchorEndMs
  const clamped = clampTimeframeToBounds(
    normalized.start,
    normalized.end,
    lifecycleBounds.startMs - SANDBOX_MONITORING_LIFECYCLE_PADDING_MS,
    maxBoundMs + SANDBOX_MONITORING_LIFECYCLE_PADDING_MS
  )

  return { start: clamped.start, end: clamped.end }
}

function applyLifecyclePadding(
  timeframe: SandboxMonitoringTimeframe,
  lifecycleBounds: SandboxLifecycleBounds | null,
  now: number
): SandboxMonitoringTimeframe {
  if (!lifecycleBounds) {
    return timeframe
  }

  let { start, end } = timeframe
  const maxBoundMs = lifecycleBounds.isRunning
    ? now
    : lifecycleBounds.anchorEndMs

  if (start <= lifecycleBounds.startMs) {
    start = lifecycleBounds.startMs - SANDBOX_MONITORING_LIFECYCLE_PADDING_MS
  }
  if (end >= maxBoundMs) {
    end = maxBoundMs + SANDBOX_MONITORING_LIFECYCLE_PADDING_MS
  }

  return { start, end }
}

export function useSandboxMonitoringController(sandboxId: string) {
  const trpcClient = useTRPCClient()
  const { team } = useDashboard()
  const { sandboxInfo, sandboxLifecycle } = useSandboxContext()

  const [urlParams, setUrlParams] = useQueryStates(monitoringUrlParams, {
    history: 'replace',
    shallow: true,
  })

  const lifecycleCreatedAt = sandboxLifecycle?.createdAt
  const lifecyclePausedAt = sandboxLifecycle?.pausedAt
  const lifecycleEndedAt = sandboxLifecycle?.endedAt
  const lifecycleState = sandboxInfo?.state
  const lifecycleEvents = sandboxLifecycle?.events
  const lifecycleBounds = useMemo(() => {
    if (!lifecycleCreatedAt || !lifecycleState) {
      return null
    }

    return getSandboxLifecycleBounds({
      createdAt: lifecycleCreatedAt,
      pausedAt: lifecyclePausedAt ?? null,
      endedAt: lifecycleEndedAt ?? null,
      state: lifecycleState,
    })
  }, [lifecycleCreatedAt, lifecycleEndedAt, lifecyclePausedAt, lifecycleState])

  const hasKilledEvent = useMemo(
    () =>
      lifecycleEvents?.some((e) => e.type === SANDBOX_LIFECYCLE_EVENT_KILLED) ??
      false,
    [lifecycleEvents]
  )
  const isLifecycleSettled =
    lifecycleBounds !== null &&
    !lifecycleBounds.isRunning &&
    (lifecycleState !== 'killed' || hasKilledEvent)

  const activePresetId = urlParams.preset ?? null

  const isLiveUpdating =
    !isLifecycleSettled &&
    activePresetId !== null &&
    isLiveEligiblePreset(activePresetId) &&
    (lifecycleBounds?.isRunning ?? false)

  // Derive the effective timeframe from URL params or active preset.
  const timeframe = useMemo(() => {
    const now = Date.now()

    if (activePresetId !== null && lifecycleBounds) {
      const presets = getMonitoringPresets(lifecycleBounds)
      const preset = findPresetById(presets, activePresetId)
      if (preset) {
        const { start, end } = preset.getValue()
        return applyLifecyclePadding({ start, end }, lifecycleBounds, now)
      }
    }

    const start = urlParams.start ?? now - SANDBOX_MONITORING_DEFAULT_RANGE_MS
    const end = urlParams.end ?? now

    const resolved = resolveTimeframe(start, end, now, lifecycleBounds)
    return applyLifecyclePadding(resolved, lifecycleBounds, now)
  }, [urlParams.start, urlParams.end, activePresetId, lifecycleBounds])

  const timeframeRef = useRef(timeframe)
  useEffect(() => {
    timeframeRef.current = timeframe
  }, [timeframe])

  // Initialize: write default timeframe to URL if no params present.
  const isInitializedRef = useRef(false)
  useEffect(() => {
    if (isInitializedRef.current) {
      return
    }
    isInitializedRef.current = true

    if (urlParams.start !== null && urlParams.end !== null) {
      return
    }

    setUrlParams({
      start: timeframe.start,
      end: timeframe.end,
      preset: activePresetId ?? SANDBOX_MONITORING_DEFAULT_PRESET_ID,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time initialization
  }, [])

  const setPreset = useCallback(
    (presetId: string) => {
      if (!lifecycleBounds) {
        return
      }

      const presets = getMonitoringPresets(lifecycleBounds)
      const preset = findPresetById(presets, presetId)
      if (!preset) {
        return
      }

      const { start, end } = preset.getValue()
      setUrlParams({ preset: presetId, start, end })
    },
    [lifecycleBounds, setUrlParams]
  )

  const setCustomTimeframe = useCallback(
    (start: number, end: number) => {
      const now = Date.now()
      const resolved = resolveTimeframe(start, end, now, lifecycleBounds)

      setUrlParams({
        preset: null,
        start: resolved.start,
        end: resolved.end,
      })
    },
    [lifecycleBounds, setUrlParams]
  )

  // Live polling tick
  useEffect(() => {
    if (!isLiveUpdating || isLifecycleSettled || !activePresetId) {
      return
    }

    let timeoutId: number | null = null

    const tick = () => {
      if (!lifecycleBounds) {
        return
      }

      const presets = getMonitoringPresets(lifecycleBounds)
      const preset = findPresetById(presets, activePresetId)
      if (!preset) {
        return
      }

      const { start, end } = preset.getValue()
      setUrlParams({ preset: activePresetId, start, end })
    }

    const scheduleNextTick = () => {
      const delayMs = getMsUntilNextAlignedInterval(
        SANDBOX_MONITORING_LIVE_POLLING_MS
      )

      timeoutId = window.setTimeout(() => {
        tick()
        scheduleNextTick()
      }, delayMs)
    }

    scheduleNextTick()

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [
    activePresetId,
    isLifecycleSettled,
    isLiveUpdating,
    lifecycleBounds,
    setUrlParams,
  ])

  const queryKey = useMemo(
    () =>
      [
        'sandboxMonitoringMetrics',
        team?.id ?? '',
        sandboxId,
        timeframe.start,
        timeframe.end,
      ] as const,
    [sandboxId, timeframe.end, timeframe.start, team?.id]
  )

  const metricsQuery = useQuery<SandboxMetric[]>({
    queryKey,
    enabled: Boolean(team?.id),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: SANDBOX_MONITORING_LIVE_POLLING_MS,
    queryFn: async () => {
      if (!team?.id) {
        return []
      }

      return trpcClient.sandbox.resourceMetrics.query({
        teamIdOrSlug: team.id,
        sandboxId,
        startMs: timeframe.start,
        endMs: timeframe.end,
      })
    },
  })

  return {
    lifecycleBounds,
    lifecycleEvents: sandboxLifecycle?.events ?? [],
    timeframe,
    metrics: metricsQuery.data ?? [],
    isLiveUpdating,
    isRefetching: metricsQuery.isFetching,
    activePresetId,
    setPreset,
    setCustomTimeframe,
  }
}
