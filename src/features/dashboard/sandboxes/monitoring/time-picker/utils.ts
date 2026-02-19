import { calculateStepForDuration } from '@/features/dashboard/sandboxes/monitoring/utils'
import { formatDatetimeInput, tryParseDatetime } from '@/lib/utils/formatting'
import type { TimeframeState } from '@/lib/utils/timeframe'
import {
  CUSTOM_PANEL_HEIGHT,
  CUSTOM_PANEL_WIDTH,
  TIME_OPTIONS,
} from './constants'

/**
 * Find a matching time option for a given duration based on the step size
 */
export function findMatchingTimeOption(duration: number | undefined) {
  if (!duration) return null

  // calculate tolerance to account for rounding errors
  const step = calculateStepForDuration(duration)
  const tolerance = step * 1.5

  return TIME_OPTIONS.find(
    (opt) => Math.abs(opt.rangeMs - duration) < tolerance
  )
}

/**
 * Extract duration from TimeframeState based on mode
 */
export function getDurationFromTimeframe(
  value: TimeframeState
): number | undefined {
  if (value.mode === 'live' && value.range) {
    return value.range
  } else if (value.mode === 'static' && value.start && value.end) {
    return value.end - value.start
  }
  return undefined
}

/**
 * Convert TimeframeState to formatted datetime strings
 * Handles both live and static modes with fallback to last hour
 */
export function formatTimeframeValues(value: TimeframeState) {
  const now = new Date()

  let startDateTime: string
  let endDateTime: string

  if (value.mode === 'live' && value.range) {
    const startTime = value.start || now.getTime() - value.range
    const endTime = value.end || now.getTime()

    startDateTime = formatDatetimeInput(new Date(startTime))
    endDateTime = formatDatetimeInput(new Date(endTime))
  } else if (value.mode === 'static' && value.start && value.end) {
    startDateTime = formatDatetimeInput(new Date(value.start))
    endDateTime = formatDatetimeInput(new Date(value.end))
  } else {
    // fallback to last hour when no valid timeframe
    const hourAgo = now.getTime() - 60 * 60 * 1000
    startDateTime = formatDatetimeInput(new Date(hourAgo))
    endDateTime = formatDatetimeInput(now)
  }

  return {
    startDateTime,
    endDateTime,
  }
}

/**
 * Calculate optimal panel position based on available viewport space
 * Prioritizes horizontal placement, falls back to vertical if needed
 */
export function calculatePanelPosition(
  dropdownRect: DOMRect | null
): 'left' | 'right' | 'top' | 'bottom' {
  if (!dropdownRect) return 'right'

  const spaceOnRight = window.innerWidth - dropdownRect.right
  const spaceOnLeft = dropdownRect.left
  const spaceOnBottom = window.innerHeight - dropdownRect.bottom
  const spaceOnTop = dropdownRect.top

  // prefer horizontal positioning
  if (spaceOnRight >= CUSTOM_PANEL_WIDTH) {
    return 'right'
  } else if (spaceOnLeft >= CUSTOM_PANEL_WIDTH) {
    return 'left'
  } else if (spaceOnBottom >= CUSTOM_PANEL_HEIGHT) {
    return 'bottom'
  } else if (spaceOnTop >= CUSTOM_PANEL_HEIGHT) {
    return 'top'
  } else {
    // will overflow but prevents layout breaks
    return 'right'
  }
}

export function parseDateTimeStrings(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return null
  return tryParseDatetime(`${dateStr} ${timeStr}`)
}
