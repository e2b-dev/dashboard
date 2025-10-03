'use client'

import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import {
  createJSONStorage,
  persist,
  StateStorage,
  subscribeWithSelector,
} from 'zustand/middleware'

import {
  TEAM_METRICS_INITIAL_RANGE_MS,
  TEAM_METRICS_TIMEFRAME_UPDATE_MS,
} from '@/configs/intervals'
import { TIME_RANGES, TimeRangeKey } from '@/lib/utils/timeframe'

/**
 * Zustand store for managing the selected time range (start/end) for team metrics charts.
 * - Persists timeframe in the URL for shareability and browser navigation support.
 * - Provides hooks for reading/updating the timeframe and for live mode updates.
 * - Exposes derived state (isLive, duration) for consumers.
 */

interface TeamMetricsState {
  // just store start and end timestamps
  start: number
  end: number
}

interface TeamMetricsActions {
  setTimeRange: (range: TimeRangeKey) => void
  setCustomRange: (start: number, end: number) => void
  updateLiveEnd: () => void
}

type Store = TeamMetricsState & TeamMetricsActions

// round timestamp to nearest interval to prevent constant updates
const getStableNow = () => {
  const now = Date.now()
  return (
    Math.floor(now / TEAM_METRICS_TIMEFRAME_UPDATE_MS) *
    TEAM_METRICS_TIMEFRAME_UPDATE_MS
  )
}

// threshold for considering a timeframe "live" (within 2% of current time or 1 minute, whichever is larger)
const LIVE_THRESHOLD_PERCENT = 0.02
const LIVE_THRESHOLD_MIN_MS = 60 * 1000

const initialNow = getStableNow()
const initialState: TeamMetricsState = {
  start: initialNow - TEAM_METRICS_INITIAL_RANGE_MS,
  end: initialNow,
}

// track if this is the first load to avoid pushing history on initial hydration
let isInitialLoad = true

// create url storage that pushes to history for navigation
const createMetricsUrlStorage = (
  initialState: TeamMetricsState
): StateStorage => ({
  getItem: (key): string => {
    const searchParams = new URLSearchParams(window.location.search)
    const storedValue = searchParams.get(key)
    if (!storedValue) {
      return JSON.stringify({
        state: initialState,
        version: 0,
      })
    }
    try {
      const parsed = JSON.parse(storedValue)
      // merge with initial state to ensure all properties exist
      return JSON.stringify({
        ...parsed,
        state: {
          ...initialState,
          ...parsed.state,
        },
      })
    } catch {
      return JSON.stringify({
        state: initialState,
        version: 0,
      })
    }
  },
  setItem: (key, newValue): void => {
    const searchParams = new URLSearchParams(window.location.search)
    const persistedData = JSON.parse(newValue)
    const stateValue = persistedData.state as TeamMetricsState

    // always store start and end in url for metrics
    const metricsParams = {
      start: stateValue.start,
      end: stateValue.end,
    }

    searchParams.set(
      key,
      JSON.stringify({
        state: metricsParams,
        version: persistedData.version,
      })
    )

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`

    // use pushState to add to history for back/forward navigation
    // only push if the url actually changed and not on initial load
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      if (isInitialLoad) {
        // replace on initial load to avoid adding unnecessary history entry
        window.history.replaceState(null, '', newUrl)
        isInitialLoad = false
      } else {
        window.history.pushState(null, '', newUrl)
      }
    }
  },
  removeItem: (key): void => {
    const searchParams = new URLSearchParams(window.location.search)
    searchParams.delete(key)
    window.history.pushState(
      null,
      '',
      `${window.location.pathname}?${searchParams.toString()}`
    )
  },
})

export const useTeamMetricsStore = create<Store>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        setTimeRange: (range: TimeRangeKey) => {
          const rangeMs = TIME_RANGES[range]
          const now = getStableNow()
          set({
            start: now - rangeMs,
            end: now,
          })
        },

        setCustomRange: (start: number, end: number) => {
          const now = getStableNow()
          const maxDaysAgo = 31 * 24 * 60 * 60 * 1000 // 31 days in ms
          const minRange = 1.5 * 60 * 1000 // 1.5 minutes minimum range

          // validate and adjust boundaries
          let validStart = Math.floor(start)
          let validEnd = Math.floor(end)

          // ensure start is not more than 31 days ago
          if (validStart < now - maxDaysAgo) {
            validStart = now - maxDaysAgo
          }

          // ensure end is not in the future
          if (validEnd > now) {
            validEnd = now
          }

          // ensure minimum range of 1.5 minutes
          const range = validEnd - validStart
          if (range < minRange) {
            // adjust to maintain minimum range, preferring to extend backward
            const midpoint = (validStart + validEnd) / 2
            validStart = Math.floor(midpoint - minRange / 2)
            validEnd = Math.floor(midpoint + minRange / 2)

            // re-check boundaries after adjustment
            if (validEnd > now) {
              validEnd = now
              validStart = validEnd - minRange
            }
            if (validStart < now - maxDaysAgo) {
              validStart = now - maxDaysAgo
              validEnd = validStart + minRange
            }
          }

          set({
            start: validStart,
            end: validEnd,
          })
        },

        updateLiveEnd: () => {
          const state = get()
          const now = getStableNow()
          const duration = state.end - state.start
          const threshold = Math.max(
            duration * LIVE_THRESHOLD_PERCENT,
            LIVE_THRESHOLD_MIN_MS
          )

          // only update if currently "live" (end is close to now)
          if (now - state.end < threshold) {
            set({
              start: now - duration, // maintain the same duration
              end: now,
            })
          }
        },
      }),
      {
        name: 'plot',
        storage: createJSONStorage(() => createMetricsUrlStorage(initialState)),
        partialize: (state) => ({
          // only persist start and end timestamps
          start: state.start,
          end: state.end,
        }),
        skipHydration: typeof window === 'undefined', // skip hydration on server
      }
    )
  )
)

// hook to handle browser navigation
export const useMetricsHistoryListener = () => {
  useEffect(() => {
    // handle browser back/forward navigation
    const handlePopState = () => {
      // trigger store rehydration from url
      useTeamMetricsStore.persist.rehydrate()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
}

// main hook for components
export const useTimeframe = () => {
  const start = useTeamMetricsStore((state) => state.start)
  const end = useTeamMetricsStore((state) => state.end)

  const setTimeRange = useTeamMetricsStore((state) => state.setTimeRange)
  const setCustomRange = useTeamMetricsStore((state) => state.setCustomRange)
  const updateLiveEnd = useTeamMetricsStore((state) => state.updateLiveEnd)

  // set up browser history listener
  useMetricsHistoryListener()

  // compute derived state with stable reference
  const timeframe = useMemo(() => {
    const duration = end - start
    const threshold = Math.max(
      duration * LIVE_THRESHOLD_PERCENT,
      LIVE_THRESHOLD_MIN_MS
    )
    // use stable now for isLive check
    const stableNow = getStableNow()
    const isLive = stableNow - end < threshold

    return {
      start,
      end,
      isLive,
      duration,
    }
  }, [start, end])

  // manage live polling directly in React (single interval per component tree)
  useEffect(() => {
    if (!timeframe.isLive) return

    const interval = setInterval(() => {
      updateLiveEnd()
    }, TEAM_METRICS_TIMEFRAME_UPDATE_MS)

    return () => {
      clearInterval(interval)
    }
  }, [timeframe.isLive, updateLiveEnd])

  return {
    timeframe,
    setTimeRange,
    setCustomRange,
  }
}
