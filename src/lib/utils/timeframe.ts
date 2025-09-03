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

export interface ResolvedTimeframe {
  start: number
  end: number
  isLive: boolean
}

import { z } from 'zod'

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
  '12H': 1000 * 60 * 60 * 12,
  '7D': 1000 * 60 * 60 * 24 * 7,
} as const

export type TimeRangeKey = keyof typeof TIME_RANGES
