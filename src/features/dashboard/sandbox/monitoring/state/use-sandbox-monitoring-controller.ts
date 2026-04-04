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
  SANDBOX_MONITORING_LIVE_DATA_THRESHOLD_MS,
  SANDBOX_MONITORING_LIVE_POLLING_MS,
  SANDBOX_MONITORING_OVERFETCH_MIN_MS,
  SANDBOX_MONITORING_OVERFETCH_RATIO,
} from '../utils/constants'

import { findPresetById, getMonitoringPresets } from '../utils/presets'
import { getSandboxLifecycleBounds } from '../utils/timeframe'

const monitoringUrlParams = {
  start: parseAsInteger,
  end: parseAsInteger,
  preset: parseAsString,
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

  const activePresetId =
    urlParams.preset ??
    (urlParams.start === null &&
    urlParams.end === null &&
    lifecycleBounds !== null
      ? SANDBOX_MONITORING_DEFAULT_PRESET_ID
      : null)

  // Derive the effective timeframe from URL params or active preset.
  const timeframe = useMemo(() => {
    const now = Date.now()

    if (activePresetId !== null && lifecycleBounds) {
      const presets = getMonitoringPresets(lifecycleBounds)
      const preset = findPresetById(presets, activePresetId)
      if (preset) {
        return preset.getValue()
      }
    }

    const start = urlParams.start ?? now - SANDBOX_MONITORING_DEFAULT_RANGE_MS
    const end = urlParams.end ?? now

    return { start, end }
  }, [urlParams.start, urlParams.end, activePresetId, lifecycleBounds])

  const shouldPoll =
    !isLifecycleSettled &&
    (lifecycleBounds?.isRunning ?? false) &&
    timeframe.end + SANDBOX_MONITORING_OVERFETCH_MIN_MS >= Date.now()

  const fetchTimeframe = useMemo(() => {
    const duration = timeframe.end - timeframe.start
    const buffer = Math.ceil(
      Math.max(
        duration * SANDBOX_MONITORING_OVERFETCH_RATIO,
        SANDBOX_MONITORING_OVERFETCH_MIN_MS
      )
    )
    return {
      start: timeframe.start - buffer,
      end: timeframe.end + buffer,
    }
  }, [timeframe.start, timeframe.end])

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
      setUrlParams({
        preset: null,
        start,
        end,
      })
    },
    [setUrlParams]
  )

  // Live polling tick
  useEffect(() => {
    if (!shouldPoll || isLifecycleSettled || !activePresetId) {
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
    shouldPoll,
    lifecycleBounds,
    setUrlParams,
  ])

  const queryKey = useMemo(
    () =>
      [
        'sandboxMonitoringMetrics',
        team?.id ?? '',
        sandboxId,
        fetchTimeframe.start,
        fetchTimeframe.end,
      ] as const,
    [sandboxId, fetchTimeframe.end, fetchTimeframe.start, team?.id]
  )

  const metricsQuery = useQuery<SandboxMetric[]>({
    queryKey,
    enabled: Boolean(team?.id),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: !isLifecycleSettled,
    refetchOnReconnect: false,
    staleTime: SANDBOX_MONITORING_LIVE_POLLING_MS,
    refetchInterval: shouldPoll ? SANDBOX_MONITORING_LIVE_POLLING_MS : false,
    queryFn: async () => {
      if (!team?.id) {
        return []
      }

      return trpcClient.sandbox.resourceMetrics.query({
        teamIdOrSlug: team.id,
        sandboxId,
        startMs: fetchTimeframe.start,
        endMs: fetchTimeframe.end,
      })
    },
  })

  const latestMetricTimestampMs = useMemo(() => {
    let latest: number | null = null

    for (const metric of metricsQuery.data ?? []) {
      const timestampMs = Math.floor(metric.timestampUnix * 1000)
      if (Number.isFinite(timestampMs)) {
        latest = latest === null ? timestampMs : Math.max(latest, timestampMs)
      }
    }

    return latest
  }, [metricsQuery.data])

  const isLive =
    shouldPoll &&
    latestMetricTimestampMs !== null &&
    Date.now() - latestMetricTimestampMs <=
      SANDBOX_MONITORING_LIVE_DATA_THRESHOLD_MS

  return {
    lifecycleBounds,
    lifecycleEvents: sandboxLifecycle?.events ?? [],
    timeframe,
    fetchTimeframe,
    metrics: metricsQuery.data ?? [],
    isInitialLoading:
      lifecycleBounds === null ||
      (metricsQuery.isPending && !metricsQuery.isFetched),
    isPolling: isLive,
    isRefetching: metricsQuery.isFetching,
    activePresetId,
    setPreset,
    setCustomTimeframe,
  }
}
