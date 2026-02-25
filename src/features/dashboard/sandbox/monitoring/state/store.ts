'use client'

import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { create } from 'zustand'
import {
  SANDBOX_MONITORING_DEFAULT_RANGE_MS,
  SANDBOX_MONITORING_MIN_RANGE_MS,
} from '../utils/constants'

interface SandboxMonitoringTimeframe {
  start: number
  end: number
  duration: number
}

function normalizeTimeframe(
  start: number,
  end: number,
  now: number = Date.now()
): SandboxMonitoringTimeframe {
  const minimumRange = SANDBOX_MONITORING_MIN_RANGE_MS

  let safeStart = Math.floor(start)
  let safeEnd = Math.floor(end)

  if (safeEnd > now) {
    safeEnd = now
  }

  if (safeEnd <= safeStart) {
    safeEnd = safeStart + minimumRange
  }

  const range = safeEnd - safeStart
  if (range < minimumRange) {
    safeStart = safeEnd - minimumRange
  }

  return {
    start: safeStart,
    end: safeEnd,
    duration: safeEnd - safeStart,
  }
}

function getDefaultTimeframe() {
  const now = Date.now()

  return normalizeTimeframe(now - SANDBOX_MONITORING_DEFAULT_RANGE_MS, now, now)
}

interface SandboxMonitoringStoreState {
  sandboxId: string | null
  timeframe: SandboxMonitoringTimeframe
  isLiveUpdating: boolean
  metrics: SandboxMetric[]
  isInitialized: boolean
}

interface SandboxMonitoringStoreActions {
  initialize: (
    sandboxId: string,
    params: {
      start?: number | null
      end?: number | null
      live?: boolean | null
    }
  ) => void
  setTimeframe: (
    start: number,
    end: number,
    options?: { isLiveUpdating?: boolean }
  ) => void
  setLiveUpdating: (isLiveUpdating: boolean, now?: number) => void
  syncLiveTimeframe: (now?: number) => SandboxMonitoringTimeframe
  setMetrics: (metrics: SandboxMetric[]) => void
}

type SandboxMonitoringStore = SandboxMonitoringStoreState &
  SandboxMonitoringStoreActions

const initialTimeframe = getDefaultTimeframe()

const initialState: SandboxMonitoringStoreState = {
  sandboxId: null,
  timeframe: initialTimeframe,
  isLiveUpdating: true,
  metrics: [],
  isInitialized: false,
}

export const useSandboxMonitoringStore = create<SandboxMonitoringStore>()(
  (set, get) => ({
    ...initialState,

    initialize: (sandboxId, params) => {
      const now = Date.now()
      const current = get()
      const isNewSandbox = current.sandboxId !== sandboxId

      const fallbackStart = now - SANDBOX_MONITORING_DEFAULT_RANGE_MS
      const fallbackEnd = now
      const start = params.start ?? fallbackStart
      const end = params.end ?? fallbackEnd
      const isLiveUpdating = params.live ?? true
      const normalized = normalizeTimeframe(start, end)

      set((state) => {
        const shouldUpdate =
          !state.isInitialized ||
          isNewSandbox ||
          state.isLiveUpdating !== isLiveUpdating ||
          state.timeframe.start !== normalized.start ||
          state.timeframe.end !== normalized.end

        if (!shouldUpdate) {
          return state
        }

        return {
          sandboxId,
          timeframe: normalized,
          isLiveUpdating,
          metrics: isNewSandbox ? [] : state.metrics,
          isInitialized: true,
        }
      })
    },

    setTimeframe: (start, end, options) => {
      set((state) => {
        const normalized = normalizeTimeframe(start, end)
        const nextLiveUpdating =
          options?.isLiveUpdating ?? state.isLiveUpdating

        if (
          state.timeframe.start === normalized.start &&
          state.timeframe.end === normalized.end &&
          state.isLiveUpdating === nextLiveUpdating
        ) {
          return state
        }

        return {
          timeframe: normalized,
          isLiveUpdating: nextLiveUpdating,
        }
      })
    },

    setLiveUpdating: (isLiveUpdating, now = Date.now()) => {
      set((state) => {
        if (state.isLiveUpdating === isLiveUpdating) {
          return state
        }

        if (!isLiveUpdating) {
          return { isLiveUpdating: false }
        }

        const nextTimeframe = normalizeTimeframe(
          now - state.timeframe.duration,
          now,
          now
        )

        return {
          isLiveUpdating: true,
          timeframe: nextTimeframe,
        }
      })
    },

    syncLiveTimeframe: (now = Date.now()) => {
      const state = get()
      if (!state.isLiveUpdating) {
        return state.timeframe
      }

      const nextTimeframe = normalizeTimeframe(
        now - state.timeframe.duration,
        now,
        now
      )

      if (
        nextTimeframe.start === state.timeframe.start &&
        nextTimeframe.end === state.timeframe.end
      ) {
        return state.timeframe
      }

      set({
        timeframe: nextTimeframe,
      })

      return nextTimeframe
    },

    setMetrics: (metrics) => {
      set({
        metrics,
      })
    },
  })
)
