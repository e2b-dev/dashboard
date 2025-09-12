/**
 * Unified timeframe management utilities for server and client components
 */

import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'

export interface TimeframeState {
  mode: 'live' | 'static'
  range?: number // milliseconds for live mode
  start?: number // explicit start timestamp for static mode
  end?: number // explicit end timestamp for static mode
}

/**
 * Enhanced timeframe with duration for consistency
 */
export interface ParsedTimeframe {
  start: number
  end: number
  isLive: boolean
  duration: number
}

/**
 * Predefined time ranges for UI
 */
export const TIME_RANGES = {
  '1h': 1000 * 60 * 60,
  '6h': 1000 * 60 * 60 * 6,
  '24h': 1000 * 60 * 60 * 24,
  '30d': 1000 * 60 * 60 * 24 * 30,
} as const

export type TimeRangeKey = keyof typeof TIME_RANGES

/**
 * Parses timeframe from the 'plot' search param (zustand URL state)
 * Used by monitoring charts for state synchronization
 */
export function parseTimeframeFromPlot(plot: string | undefined): {
  start: number
  end: number
} {
  const defaultNow = Date.now()
  const defaultStart = defaultNow - TEAM_METRICS_INITIAL_RANGE_MS
  const defaultEnd = defaultNow

  if (!plot) {
    return { start: defaultStart, end: defaultEnd }
  }

  try {
    const parsed = JSON.parse(plot)
    if (parsed.state?.start && parsed.state?.end) {
      return {
        start: parsed.state.start,
        end: parsed.state.end,
      }
    }
  } catch (e) {
    // invalid plot param, use defaults
  }

  return { start: defaultStart, end: defaultEnd }
}

/**
 * Determines if timeframe is "live" based on how close end is to now
 * Uses same logic as concurrent-chart.client for consistency
 */
export function isLiveTimeframe(
  start: number,
  end: number,
  now: number = Date.now()
): boolean {
  const duration = end - start
  const threshold = Math.max(duration * 0.02, 60 * 1000) // 2% of duration or 1 minute minimum
  return now - end < threshold
}

/**
 * Creates a consistent timeframe object with live detection
 */
export function createTimeframe(
  start: number,
  end: number,
  now: number = Date.now()
): ParsedTimeframe {
  return {
    start,
    end,
    isLive: isLiveTimeframe(start, end, now),
    duration: end - start,
  }
}

/**
 * Parses and creates a complete timeframe from plot search param
 */
export function parseAndCreateTimeframe(
  plot: string | undefined,
  now: number = Date.now()
): ParsedTimeframe {
  const { start, end } = parseTimeframeFromPlot(plot)

  return createTimeframe(start, end, now)
}
