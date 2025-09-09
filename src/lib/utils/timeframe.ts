/**
 * Unified timeframe management utilities for server and client components
 */

import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'
import { z } from 'zod'

export interface TimeframeState {
  mode: 'live' | 'static'
  range?: number // milliseconds for live mode
  start?: number // explicit start timestamp for static mode
  end?: number // explicit end timestamp for static mode
}

export interface ResolvedTimeframe {
  start: number
  end: number
  isLive: boolean
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

const SearchParamsSchema = z.object({
  charts_start: z.string().optional(),
  charts_end: z.string().optional(),
})

/**
 * Parse search parameters into timeframe state
 */
export function parseTimeframeFromSearchParams(searchParams: {
  charts_start?: string
  charts_end?: string
}): TimeframeState {
  const validatedParams = SearchParamsSchema.safeParse(searchParams)

  if (!validatedParams.success) {
    return {
      mode: 'live',
      range: TEAM_METRICS_INITIAL_RANGE_MS,
    }
  }

  const { charts_start, charts_end } = validatedParams.data

  const chartsStart = charts_start ? parseInt(charts_start) : null
  const chartsEnd = charts_end ? parseInt(charts_end) : null

  // if both start and end are present, use static mode
  if (chartsStart && chartsEnd && !isNaN(chartsStart) && !isNaN(chartsEnd)) {
    return {
      mode: 'static',
      start: chartsStart,
      end: chartsEnd,
    }
  }

  // otherwise, use live mode with default range
  return {
    mode: 'live',
    range: TEAM_METRICS_INITIAL_RANGE_MS,
  }
}

/**
 * Resolve timeframe state to actual timestamps
 * @param state - The timeframe state to resolve
 * @param fixedNow - Optional fixed timestamp for consistent resolution across components
 */
export function resolveTimeframe(
  state: TimeframeState,
  fixedNow?: number
): ResolvedTimeframe {
  if (state.mode === 'static' && state.start && state.end) {
    return {
      start: state.start,
      end: state.end,
      isLive: false,
    }
  }

  const now = fixedNow ?? Date.now()
  const range = state.range || TEAM_METRICS_INITIAL_RANGE_MS

  return {
    start: now - range,
    end: now,
    isLive: true,
  }
}

/**
 * Resolve timeframe from search params with consistent timestamp
 * Useful for server components that need to share the same "now" timestamp
 */
export function resolveTimeframeFromSearchParams(
  searchParams: {
    charts_start?: string
    charts_end?: string
  },
  fixedNow?: number
): ResolvedTimeframe {
  const timeframeState = parseTimeframeFromSearchParams(searchParams)
  return resolveTimeframe(timeframeState, fixedNow)
}

/**
 * Convert timeframe state to search params for URL sharing
 */
export function timeframeToSearchParams(
  state: TimeframeState
): Record<string, string> {
  if (state.mode === 'static' && state.start && state.end) {
    return {
      charts_start: Math.floor(state.start).toString(),
      charts_end: Math.floor(state.end).toString(),
    }
  }

  // For live mode, don't include search params
  return {}
}

/**
 * Predefined time ranges for UI
 */
export const TIME_RANGES = {
  '1h': 1000 * 60 * 60,
  '6h': 1000 * 60 * 60 * 6,
  '24h': 1000 * 60 * 60 * 24,
  '30d': 1000 * 60 * 60 * 24 * 3,
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
