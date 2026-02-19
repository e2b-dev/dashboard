import { calculateStepForDuration } from '@/features/dashboard/sandboxes/monitoring/utils'
import { TIME_RANGES } from '@/lib/utils/timeframe'
import { TIME_OPTIONS, type TimeOption } from '../../time-picker/constants'

/**
 * Find matching time range from TIME_RANGES with tolerance
 */
export function findMatchingChartRange(duration: number) {
  const step = calculateStepForDuration(duration)
  const tolerance = step * 1.5

  const matchingRange = Object.entries(TIME_RANGES).find(
    ([_, rangeMs]) => Math.abs(rangeMs - duration) < tolerance
  )

  return matchingRange ? matchingRange[0] : 'custom'
}

/**
 * Find matching time option from TIME_OPTIONS with tolerance
 */
export function findMatchingTimeOption(
  duration: number,
  isLive: boolean
): TimeOption | null {
  if (!isLive) return null

  const step = calculateStepForDuration(duration)
  const tolerance = step * 1.5

  return (
    TIME_OPTIONS.find((opt) => Math.abs(opt.rangeMs - duration) < tolerance) ??
    null
  )
}
