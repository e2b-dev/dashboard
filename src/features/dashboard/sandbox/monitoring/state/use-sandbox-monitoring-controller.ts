'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import { useSandboxContext } from '@/features/dashboard/sandbox/context'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { useTRPCClient } from '@/trpc/client'
import {
  SANDBOX_MONITORING_DEFAULT_RANGE_MS,
  SANDBOX_MONITORING_LIVE_POLLING_MS,
  SANDBOX_MONITORING_MAX_RANGE_MS,
  SANDBOX_MONITORING_MIN_RANGE_MS,
  SANDBOX_MONITORING_QUERY_END_PARAM,
  SANDBOX_MONITORING_QUERY_LIVE_FALSE,
  SANDBOX_MONITORING_QUERY_LIVE_PARAM,
  SANDBOX_MONITORING_QUERY_LIVE_TRUE,
  SANDBOX_MONITORING_QUERY_START_PARAM,
} from '../utils/constants'
import {
  clampTimeframeToBounds,
  getSandboxLifecycleBounds,
  normalizeMonitoringTimeframe,
  parseMonitoringQueryState,
  type SandboxLifecycleBounds,
} from '../utils/timeframe'

interface SandboxMonitoringTimeframe {
  start: number
  end: number
  duration: number
}

interface SandboxMonitoringControllerState {
  sandboxId: string | null
  timeframe: SandboxMonitoringTimeframe
  isLiveUpdating: boolean
  isInitialized: boolean
}

interface ApplyTimeframeOptions {
  isLiveUpdating?: boolean
}

type SandboxMonitoringControllerAction =
  | {
      type: 'initialize'
      payload: {
        sandboxId: string
        timeframe: SandboxMonitoringTimeframe
        isLiveUpdating: boolean
      }
    }
  | {
      type: 'setTimeframe'
      payload: {
        timeframe: SandboxMonitoringTimeframe
        isLiveUpdating: boolean
      }
    }
  | {
      type: 'setLiveUpdating'
      payload: {
        isLiveUpdating: boolean
      }
    }

function toTimeframe(start: number, end: number): SandboxMonitoringTimeframe {
  return {
    start,
    end,
    duration: end - start,
  }
}

function getDefaultTimeframe(
  now: number = Date.now()
): SandboxMonitoringTimeframe {
  const normalized = normalizeMonitoringTimeframe({
    start: now - SANDBOX_MONITORING_DEFAULT_RANGE_MS,
    end: now,
    now,
    minRangeMs: SANDBOX_MONITORING_MIN_RANGE_MS,
    maxRangeMs: SANDBOX_MONITORING_MAX_RANGE_MS,
  })

  return toTimeframe(normalized.start, normalized.end)
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
    now,
    minRangeMs: SANDBOX_MONITORING_MIN_RANGE_MS,
    maxRangeMs: SANDBOX_MONITORING_MAX_RANGE_MS,
  })

  if (!lifecycleBounds) {
    return toTimeframe(normalized.start, normalized.end)
  }

  const maxBoundMs = lifecycleBounds.isRunning
    ? now
    : lifecycleBounds.anchorEndMs
  const clamped = clampTimeframeToBounds(
    normalized.start,
    normalized.end,
    lifecycleBounds.startMs,
    maxBoundMs
  )

  return toTimeframe(clamped.start, clamped.end)
}

function sandboxMonitoringControllerReducer(
  state: SandboxMonitoringControllerState,
  action: SandboxMonitoringControllerAction
): SandboxMonitoringControllerState {
  switch (action.type) {
    case 'initialize': {
      const { sandboxId, timeframe, isLiveUpdating } = action.payload

      if (
        state.isInitialized &&
        state.sandboxId === sandboxId &&
        state.isLiveUpdating === isLiveUpdating &&
        state.timeframe.start === timeframe.start &&
        state.timeframe.end === timeframe.end
      ) {
        return state
      }

      return {
        sandboxId,
        timeframe,
        isLiveUpdating,
        isInitialized: true,
      }
    }

    case 'setTimeframe': {
      const { timeframe, isLiveUpdating } = action.payload
      if (
        state.timeframe.start === timeframe.start &&
        state.timeframe.end === timeframe.end &&
        state.isLiveUpdating === isLiveUpdating
      ) {
        return state
      }

      return {
        ...state,
        timeframe,
        isLiveUpdating,
      }
    }

    case 'setLiveUpdating': {
      if (state.isLiveUpdating === action.payload.isLiveUpdating) {
        return state
      }

      return {
        ...state,
        isLiveUpdating: action.payload.isLiveUpdating,
      }
    }

    default:
      return state
  }
}

function createInitialState(): SandboxMonitoringControllerState {
  return {
    sandboxId: null,
    timeframe: getDefaultTimeframe(),
    isLiveUpdating: true,
    isInitialized: false,
  }
}

export function useSandboxMonitoringController(sandboxId: string) {
  const trpcClient = useTRPCClient()
  const { team } = useDashboard()
  const { sandboxInfo } = useSandboxContext()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [state, dispatch] = useReducer(
    sandboxMonitoringControllerReducer,
    undefined,
    createInitialState
  )
  const stateRef = useRef(state)
  const durationRef = useRef(state.timeframe.duration)

  const queryStart = searchParams.get(SANDBOX_MONITORING_QUERY_START_PARAM)
  const queryEnd = searchParams.get(SANDBOX_MONITORING_QUERY_END_PARAM)
  const queryLive = searchParams.get(SANDBOX_MONITORING_QUERY_LIVE_PARAM)
  const searchParamsString = searchParams.toString()

  const queryState = useMemo(
    () =>
      parseMonitoringQueryState({
        start: queryStart,
        end: queryEnd,
        live: queryLive,
      }),
    [queryEnd, queryLive, queryStart]
  )

  const lifecycleStartedAt = sandboxInfo?.startedAt
  const lifecycleEndAt = sandboxInfo?.endAt
  const lifecycleStoppedAt =
    sandboxInfo && 'stoppedAt' in sandboxInfo ? sandboxInfo.stoppedAt : null
  const lifecycleState = sandboxInfo?.state
  const lifecycleBounds = useMemo(() => {
    if (!lifecycleStartedAt || !lifecycleState) {
      return null
    }

    return getSandboxLifecycleBounds({
      startedAt: lifecycleStartedAt,
      endAt: lifecycleEndAt ?? null,
      stoppedAt: lifecycleStoppedAt ?? null,
      state: lifecycleState,
    })
  }, [lifecycleEndAt, lifecycleStartedAt, lifecycleStoppedAt, lifecycleState])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const applyTimeframe = useCallback(
    (start: number, end: number, options?: ApplyTimeframeOptions) => {
      const currentState = stateRef.current
      const now = Date.now()
      const timeframe = resolveTimeframe(start, end, now, lifecycleBounds)
      const requestedLiveUpdating =
        options?.isLiveUpdating ?? currentState.isLiveUpdating
      const nextLiveUpdating = lifecycleBounds?.isRunning
        ? requestedLiveUpdating
        : lifecycleBounds
          ? false
          : requestedLiveUpdating

      if (
        currentState.timeframe.start === timeframe.start &&
        currentState.timeframe.end === timeframe.end &&
        currentState.isLiveUpdating === nextLiveUpdating
      ) {
        return
      }

      dispatch({
        type: 'setTimeframe',
        payload: {
          timeframe,
          isLiveUpdating: nextLiveUpdating,
        },
      })
    },
    [lifecycleBounds]
  )

  const setLiveUpdating = useCallback(
    (isLiveUpdating: boolean) => {
      const currentState = stateRef.current

      if (!isLiveUpdating) {
        if (!currentState.isLiveUpdating) {
          return
        }

        dispatch({
          type: 'setLiveUpdating',
          payload: { isLiveUpdating: false },
        })

        return
      }

      if (lifecycleBounds && !lifecycleBounds.isRunning) {
        if (!currentState.isLiveUpdating) {
          return
        }

        dispatch({
          type: 'setLiveUpdating',
          payload: { isLiveUpdating: false },
        })

        return
      }

      const now = Date.now()
      const anchorEndMs = lifecycleBounds?.isRunning
        ? now
        : (lifecycleBounds?.anchorEndMs ?? now)

      applyTimeframe(anchorEndMs - durationRef.current, anchorEndMs, {
        isLiveUpdating: true,
      })
    },
    [applyTimeframe, lifecycleBounds]
  )

  useEffect(() => {
    durationRef.current = state.timeframe.duration
  }, [state.timeframe.duration])

  useEffect(() => {
    const now = Date.now()
    const currentState = stateRef.current
    const hasExplicitRange =
      queryState.start !== null && queryState.end !== null
    const requestedLiveUpdating = queryState.live ?? true
    const start = hasExplicitRange
      ? queryState.start
      : currentState.isInitialized && currentState.sandboxId === sandboxId
        ? requestedLiveUpdating
          ? now - durationRef.current
          : currentState.timeframe.start
        : now - SANDBOX_MONITORING_DEFAULT_RANGE_MS
    const end = hasExplicitRange
      ? queryState.end
      : currentState.isInitialized && currentState.sandboxId === sandboxId
        ? requestedLiveUpdating
          ? now
          : currentState.timeframe.end
        : now

    if (start === null || end === null) {
      return
    }

    const timeframe = resolveTimeframe(start, end, now, lifecycleBounds)

    dispatch({
      type: 'initialize',
      payload: {
        sandboxId,
        timeframe,
        isLiveUpdating:
          lifecycleBounds && !lifecycleBounds.isRunning
            ? false
            : requestedLiveUpdating,
      },
    })
  }, [
    lifecycleBounds,
    queryState.end,
    queryState.live,
    queryState.start,
    sandboxId,
  ])

  useEffect(() => {
    if (!state.isInitialized || !state.isLiveUpdating) {
      return
    }

    if (lifecycleBounds && !lifecycleBounds.isRunning) {
      return
    }

    const tick = () => {
      const now = Date.now()
      const anchorEndMs = lifecycleBounds?.isRunning
        ? now
        : (lifecycleBounds?.anchorEndMs ?? now)

      applyTimeframe(anchorEndMs - durationRef.current, anchorEndMs, {
        isLiveUpdating: true,
      })
    }

    const intervalId = window.setInterval(
      tick,
      SANDBOX_MONITORING_LIVE_POLLING_MS
    )

    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    applyTimeframe,
    lifecycleBounds,
    state.isInitialized,
    state.isLiveUpdating,
  ])

  useEffect(() => {
    if (!state.isInitialized) {
      return
    }

    const nextLive = state.isLiveUpdating
      ? SANDBOX_MONITORING_QUERY_LIVE_TRUE
      : SANDBOX_MONITORING_QUERY_LIVE_FALSE
    const nextStart = String(state.timeframe.start)
    const nextEnd = String(state.timeframe.end)
    const shouldPersistExplicitRange = !state.isLiveUpdating

    if (
      queryLive === nextLive &&
      (shouldPersistExplicitRange
        ? queryStart === nextStart && queryEnd === nextEnd
        : queryStart === null && queryEnd === null)
    ) {
      return
    }

    const nextParams = new URLSearchParams(searchParamsString)
    nextParams.set(SANDBOX_MONITORING_QUERY_LIVE_PARAM, nextLive)

    if (shouldPersistExplicitRange) {
      nextParams.set(SANDBOX_MONITORING_QUERY_START_PARAM, nextStart)
      nextParams.set(SANDBOX_MONITORING_QUERY_END_PARAM, nextEnd)
    } else {
      nextParams.delete(SANDBOX_MONITORING_QUERY_START_PARAM)
      nextParams.delete(SANDBOX_MONITORING_QUERY_END_PARAM)
    }

    router.replace(`${pathname}?${nextParams.toString()}`, {
      scroll: false,
    })
  }, [
    pathname,
    queryEnd,
    queryLive,
    queryStart,
    router,
    searchParamsString,
    state.isInitialized,
    state.isLiveUpdating,
    state.timeframe.end,
    state.timeframe.start,
  ])

  const queryKey = useMemo(
    () =>
      [
        'sandboxMonitoringMetrics',
        team?.id ?? '',
        sandboxId,
        state.timeframe.start,
        state.timeframe.end,
      ] as const,
    [sandboxId, state.timeframe.end, state.timeframe.start, team?.id]
  )

  const metricsQuery = useQuery<SandboxMetric[]>({
    queryKey,
    enabled: state.isInitialized && Boolean(team?.id),
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
        startMs: state.timeframe.start,
        endMs: state.timeframe.end,
      })
    },
  })

  return {
    lifecycleBounds,
    timeframe: state.timeframe,
    metrics: metricsQuery.data ?? [],
    isLiveUpdating: state.isLiveUpdating,
    isRefetching: metricsQuery.isFetching,
    setTimeframe: applyTimeframe,
    setLiveUpdating,
  }
}
