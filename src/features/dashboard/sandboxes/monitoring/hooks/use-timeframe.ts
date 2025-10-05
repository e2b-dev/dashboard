'use client'

import {
  TEAM_METRICS_INITIAL_RANGE_MS,
  TEAM_METRICS_TIMEFRAME_UPDATE_MS,
} from '@/configs/intervals'
import { TIME_RANGES, TimeRangeKey } from '@/lib/utils/timeframe'
import { parseAsInteger, useQueryStates } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { useInterval } from 'usehooks-ts'

const LIVE_THRESHOLD_PERCENT = 0.02
const LIVE_THRESHOLD_MIN_MS = 60 * 1000
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
  const initialNow = getStableNow()

  const [params, setParams] = useQueryStates(timeframeParams, {
    history: 'push',
    shallow: true,
  })

  const start = params.start ?? initialNow - TEAM_METRICS_INITIAL_RANGE_MS
  const end = params.end ?? initialNow

  const timeframe = useMemo(() => {
    const duration = end - start
    const threshold = Math.max(
      duration * LIVE_THRESHOLD_PERCENT,
      LIVE_THRESHOLD_MIN_MS
    )
    const stableNow = getStableNow()
    const isLive = stableNow - end < threshold

    return {
      start,
      end,
      isLive,
      duration,
    }
  }, [start, end])

  const setTimeRange = (range: TimeRangeKey) => {
    const rangeMs = TIME_RANGES[range]
    const now = getStableNow()
    const validated = validateTimeRange(now - rangeMs, now)
    setParams(validated)
  }

  const setCustomRange = (start: number, end: number) => {
    const validated = validateTimeRange(start, end)
    setParams(validated)
  }

  const handleTimeframeUpdate = useCallback(() => {
    if (!timeframe.isLive) return

    const now = getStableNow()
    const duration = timeframe.duration
    const validated = validateTimeRange(now - duration, now)
    setParams(validated)
  }, [timeframe.isLive, timeframe.duration, setParams])

  useInterval(
    handleTimeframeUpdate,
    timeframe.isLive ? TEAM_METRICS_TIMEFRAME_UPDATE_MS : null
  )

  return {
    timeframe,
    setTimeRange,
    setCustomRange,
  }
}
