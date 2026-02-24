'use client'

import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { create } from 'zustand'
import { calculateIsLive } from './utils'

const DEFAULT_RANGE_MS = 1 * 60 * 60 * 1000 // 1 hour
const MAX_DAYS_AGO_MS = 31 * 24 * 60 * 60 * 1000
const MIN_RANGE_MS = 90 * 1000

const getStableNow = () => Math.floor(Date.now() / 1000) * 1000

function normalizeTimeframe(start: number, end: number) {
  const now = getStableNow()

  let safeStart = Math.floor(start)
  let safeEnd = Math.floor(end)

  if (safeEnd > now) {
    safeEnd = now
  }

  if (safeStart < now - MAX_DAYS_AGO_MS) {
    safeStart = now - MAX_DAYS_AGO_MS
  }

  if (safeEnd <= safeStart) {
    safeEnd = safeStart + MIN_RANGE_MS
  }

  const range = safeEnd - safeStart
  if (range < MIN_RANGE_MS) {
    safeStart = safeEnd - MIN_RANGE_MS
  }

  return {
    start: safeStart,
    end: safeEnd,
    duration: safeEnd - safeStart,
    isLive: calculateIsLive(safeStart, safeEnd, now),
  }
}

function getDefaultTimeframe() {
  const now = getStableNow()
  return normalizeTimeframe(now - DEFAULT_RANGE_MS, now)
}

interface SandboxMonitoringStoreState {
  sandboxId: string | null
  timeframe: {
    start: number
    end: number
    duration: number
    isLive: boolean
  }
  metrics: SandboxMetric[]
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

interface SandboxMonitoringStoreActions {
  initialize: (
    sandboxId: string,
    params: { start?: number | null; end?: number | null }
  ) => void
  setTimeframe: (start: number, end: number) => void
  setMetrics: (metrics: SandboxMetric[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

type SandboxMonitoringStore = SandboxMonitoringStoreState &
  SandboxMonitoringStoreActions

const initialTimeframe = getDefaultTimeframe()

const initialState: SandboxMonitoringStoreState = {
  sandboxId: null,
  timeframe: initialTimeframe,
  metrics: [],
  isLoading: false,
  error: null,
  isInitialized: false,
}

function sortMetricsByTime(metrics: SandboxMetric[]): SandboxMetric[] {
  return [...metrics].sort((a, b) => {
    const timeA =
      typeof a.timestampUnix === 'number'
        ? a.timestampUnix * 1000
        : new Date(a.timestamp).getTime()
    const timeB =
      typeof b.timestampUnix === 'number'
        ? b.timestampUnix * 1000
        : new Date(b.timestamp).getTime()
    return timeA - timeB
  })
}

export const useSandboxMonitoringStore = create<SandboxMonitoringStore>()(
  (set, get) => ({
    ...initialState,

    initialize: (sandboxId, params) => {
      const now = getStableNow()
      const current = get()
      const isNewSandbox = current.sandboxId !== sandboxId

      const fallbackStart = now - DEFAULT_RANGE_MS
      const fallbackEnd = now
      const start = params.start ?? fallbackStart
      const end = params.end ?? fallbackEnd
      const normalized = normalizeTimeframe(start, end)

      set((state) => {
        const shouldUpdateTimeframe =
          !state.isInitialized ||
          isNewSandbox ||
          state.timeframe.start !== normalized.start ||
          state.timeframe.end !== normalized.end

        if (!shouldUpdateTimeframe) {
          return state
        }

        return {
          sandboxId,
          timeframe: normalized,
          metrics: isNewSandbox ? [] : state.metrics,
          isLoading: isNewSandbox ? false : state.isLoading,
          error: isNewSandbox ? null : state.error,
          isInitialized: true,
        }
      })
    },

    setTimeframe: (start, end) => {
      set((state) => ({
        timeframe: normalizeTimeframe(start, end),
        error: state.error,
      }))
    },

    setMetrics: (metrics) => {
      set({
        metrics: sortMetricsByTime(metrics),
      })
    },

    setLoading: (isLoading) => {
      set({ isLoading })
    },

    setError: (error) => {
      set({ error })
    },
  })
)
