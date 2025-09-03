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
import { useConnectedCharts } from '@/lib/hooks/use-connected-charts'
import { TIME_RANGES, TimeRangeKey } from '@/lib/utils/timeframe'

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
          set({
            start: Math.floor(start),
            end: Math.floor(end),
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
        name: 'metrics',
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

// hook for chart registration
export const useRegisterChart = () => {
  const { registerChart } = useConnectedCharts('sandboxes-monitoring')
  return registerChart
}

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
export const useTeamMetrics = () => {
  const start = useTeamMetricsStore((state) => state.start)
  const end = useTeamMetricsStore((state) => state.end)
  const setTimeRange = useTeamMetricsStore((state) => state.setTimeRange)
  const setCustomRange = useTeamMetricsStore((state) => state.setCustomRange)
  const registerChart = useRegisterChart()

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
    }
  }, [start, end])

  return {
    timeframe,
    setTimeRange,
    setCustomRange,
    // compatibility methods for smooth transition
    setLiveMode: (range: number) => {
      const now = getStableNow()
      setCustomRange(now - range, now)
    },
    setStaticMode: setCustomRange,
    registerChart,
  }
}

// auto-update end timestamp for live data
if (typeof window !== 'undefined') {
  setInterval(() => {
    useTeamMetricsStore.getState().updateLiveEnd()
  }, TEAM_METRICS_TIMEFRAME_UPDATE_MS)
}
