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
  SANDBOX_MONITORING_DEFAULT_RANGE_MS,
  SANDBOX_MONITORING_LIVE_POLLING_MS,
  SANDBOX_MONITORING_MAX_RANGE_MS,
  SANDBOX_MONITORING_MIN_RANGE_MS,
  SANDBOX_MONITORING_QUERY_LIVE_FALSE,
  SANDBOX_MONITORING_QUERY_LIVE_TRUE,
  SANDBOX_MONITORING_LIFECYCLE_PADDING_MS,
  SANDBOX_LIFECYCLE_EVENT_KILLED,
} from '../utils/constants'
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
  live: parseAsString.withDefault(SANDBOX_MONITORING_QUERY_LIVE_TRUE),
}

function getPaddedLiveEndMs(
  lifecycleBounds: SandboxLifecycleBounds | null,
  now: number
): number {
  const anchorEndMs = lifecycleBounds?.isRunning
    ? now
    : (lifecycleBounds?.anchorEndMs ?? now)

  return anchorEndMs + SANDBOX_MONITORING_LIFECYCLE_PADDING_MS
}

function resolveTimeframe(
  start: number,
  end: number,
  now: number,
  lifecycleBounds: SandboxLifecycleBounds | null
): SandboxMonitoringTimeframe {
  // Extend the upper bound so padded timestamps (e.g. anchorEndMs + padding)
  // survive normalizeMonitoringTimeframe's now-based clamping.
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

  // When killed, keep polling until the killed lifecycle event arrives from
  // the backend so the chart can render the final data and event marker.
  const hasKilledEvent = useMemo(
    () =>
      lifecycleEvents?.some(
        (e) => e.type === SANDBOX_LIFECYCLE_EVENT_KILLED
      ) ?? false,
    [lifecycleEvents]
  )
  const isLifecycleSettled =
    lifecycleBounds !== null &&
    !lifecycleBounds.isRunning &&
    (lifecycleState !== 'killed' || hasKilledEvent)

  const isLiveUpdating = isLifecycleSettled
    ? false
    : urlParams.live !== SANDBOX_MONITORING_QUERY_LIVE_FALSE

  // Derive the effective timeframe from URL params.
  // When params are null (first visit or live mode), compute from defaults.
  const timeframe = useMemo(() => {
    const now = Date.now()
    const start =
      urlParams.start ?? now - SANDBOX_MONITORING_DEFAULT_RANGE_MS
    const end = urlParams.end ?? now

    const resolved = resolveTimeframe(start, end, now, lifecycleBounds)
    return applyLifecyclePadding(resolved, lifecycleBounds, now)
  }, [urlParams.start, urlParams.end, lifecycleBounds])

  // Ref for the live tick to read current timeframe without being a dependency.
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

    // If URL already has explicit start/end, no initialization needed.
    if (urlParams.start !== null && urlParams.end !== null) {
      return
    }

    // Write the computed default timeframe to URL.
    setUrlParams({
      start: timeframe.start,
      end: timeframe.end,
      live: isLiveUpdating
        ? SANDBOX_MONITORING_QUERY_LIVE_TRUE
        : SANDBOX_MONITORING_QUERY_LIVE_FALSE,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time initialization
  }, [])

  const applyTimeframe = useCallback(
    (
      start: number,
      end: number,
      options?: { isLiveUpdating?: boolean }
    ) => {
      const now = Date.now()
      const resolved = resolveTimeframe(start, end, now, lifecycleBounds)
      const nextLive = isLifecycleSettled
        ? false
        : (options?.isLiveUpdating ?? isLiveUpdating)

      setUrlParams({
        start: resolved.start,
        end: resolved.end,
        live: nextLive
          ? SANDBOX_MONITORING_QUERY_LIVE_TRUE
          : SANDBOX_MONITORING_QUERY_LIVE_FALSE,
      })
    },
    [isLifecycleSettled, isLiveUpdating, lifecycleBounds, setUrlParams]
  )

  const setLiveUpdating = useCallback(
    (live: boolean) => {
      if (!live || isLifecycleSettled) {
        setUrlParams({ live: SANDBOX_MONITORING_QUERY_LIVE_FALSE })
        return
      }

      const current = timeframeRef.current
      applyTimeframe(
        current.start,
        getPaddedLiveEndMs(lifecycleBounds, Date.now()),
        { isLiveUpdating: true }
      )
    },
    [applyTimeframe, isLifecycleSettled, lifecycleBounds, setUrlParams]
  )

  // Live polling tick
  useEffect(() => {
    if (!isLiveUpdating || isLifecycleSettled) {
      return
    }

    const tick = () => {
      const current = timeframeRef.current
      applyTimeframe(
        current.start,
        getPaddedLiveEndMs(lifecycleBounds, Date.now()),
        { isLiveUpdating: true }
      )
    }

    let timeoutId: number | null = null

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
    applyTimeframe,
    isLifecycleSettled,
    isLiveUpdating,
    lifecycleBounds,
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
    setTimeframe: applyTimeframe,
    setLiveUpdating,
  }
}
