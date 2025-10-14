'use client'

import {
  TEAM_METRICS_INITIAL_RANGE_MS,
  TEAM_METRICS_TIMEFRAME_UPDATE_MS,
} from '@/configs/intervals'
import { TIME_RANGES, TimeRangeKey } from '@/lib/utils/timeframe'
import { parseAsInteger, useQueryStates } from 'nuqs'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { calculateIsLive } from '../utils'

const MAX_DAYS_AGO = 31 * 24 * 60 * 60 * 1000
const MIN_RANGE_MS = 1.5 * 60 * 1000

const getStableNow = () => {
  const now = Date.now()
  return (
    Math.floor(now / TEAM_METRICS_TIMEFRAME_UPDATE_MS) *
    TEAM_METRICS_TIMEFRAME_UPDATE_MS
  )
}

function validateTimeRange(
  start: number,
  end: number
): { start: number; end: number } {
  const now = getStableNow()

  let validStart = Math.floor(start)
  let validEnd = Math.floor(end)

  if (validStart < now - MAX_DAYS_AGO) {
    validStart = now - MAX_DAYS_AGO
  }

  if (validEnd > now) {
    validEnd = now
  }

  const range = validEnd - validStart
  if (range < MIN_RANGE_MS) {
    const midpoint = (validStart + validEnd) / 2
    validStart = Math.floor(midpoint - MIN_RANGE_MS / 2)
    validEnd = Math.floor(midpoint + MIN_RANGE_MS / 2)

    if (validEnd > now) {
      validEnd = now
      validStart = validEnd - MIN_RANGE_MS
    }
    if (validStart < now - MAX_DAYS_AGO) {
      validStart = now - MAX_DAYS_AGO
      validEnd = validStart + MIN_RANGE_MS
    }
  }

  return { start: validStart, end: validEnd }
}

const timeframeParams = {
  start: parseAsInteger,
  end: parseAsInteger,
}

export const useTimeframe = () => {
  const initialNowRef = useRef(getStableNow())
  const lastUpdateRef = useRef<number>(0)

  const [params, setParams] = useQueryStates(timeframeParams, {
    history: 'push',
    shallow: true,
  })

  const start = useMemo(
    () => params.start ?? initialNowRef.current - TEAM_METRICS_INITIAL_RANGE_MS,
    [params.start]
  )
  const end = useMemo(() => params.end ?? initialNowRef.current, [params.end])

  // calculate isLive at the time params were set, not at render time
  const timeframe = useMemo(() => {
    const duration = end - start
    const now = getStableNow()
    const isLive = calculateIsLive(start, end, now)

    return {
      start,
      end,
      isLive,
      duration,
    }
  }, [start, end])

  const setTimeRange = useCallback(
    (range: TimeRangeKey) => {
      const rangeMs = TIME_RANGES[range]
      const now = getStableNow()
      const validated = validateTimeRange(now - rangeMs, now)
      setParams(validated)
      lastUpdateRef.current = now
    },
    [setParams]
  )

  const setCustomRange = useCallback(
    (start: number, end: number) => {
      const validated = validateTimeRange(start, end)
      setParams(validated)
      lastUpdateRef.current = Date.now()
    },
    [setParams]
  )

  // stable ref for the update function to prevent interval restarts
  const updateTimeframeRef = useRef<(() => void) | null>(null)
  updateTimeframeRef.current = () => {
    const now = getStableNow()

    // prevent updates faster than the interval
    const timeSinceLastUpdate = now - lastUpdateRef.current
    if (timeSinceLastUpdate < TEAM_METRICS_TIMEFRAME_UPDATE_MS - 100) {
      return
    }

    const duration = timeframe.duration
    const validated = validateTimeRange(now - duration, now)

    // only update if values actually changed
    if (validated.start !== start || validated.end !== end) {
      setParams(validated)
      lastUpdateRef.current = now
    }
  }

  useEffect(() => {
    if (!timeframe.isLive) return

    let intervalId: NodeJS.Timeout | null = null
    let isVisible = !document.hidden

    const startInterval = () => {
      if (intervalId) return
      intervalId = setInterval(() => {
        updateTimeframeRef.current?.()
      }, TEAM_METRICS_TIMEFRAME_UPDATE_MS)
    }

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibilityChange = () => {
      const nowVisible = !document.hidden

      if (nowVisible && !isVisible) {
        // tab became visible - do immediate update then start interval
        isVisible = true
        updateTimeframeRef.current?.()
        startInterval()
      } else if (!nowVisible && isVisible) {
        // tab became hidden - stop interval
        isVisible = false
        stopInterval()
      }
    }

    // start interval if visible
    if (isVisible) {
      startInterval()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopInterval()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [timeframe.isLive])

  return {
    timeframe,
    setTimeRange,
    setCustomRange,
  }
}
