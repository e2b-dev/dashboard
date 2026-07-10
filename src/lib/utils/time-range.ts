import type { TimeRangePreset } from '@/ui/time-range-presets'

/**
 * Finds which preset matches the given timeframe (with tolerance).
 * Presets can overlap within the tolerance (e.g. "This month" vs "Last 30
 * days" near month ends), so the closest match wins, not the first one.
 */
export function findMatchingPreset(
  presets: TimeRangePreset[],
  start: number,
  end: number,
  toleranceMs = 10 * 1000 // 10 seconds
): string | undefined {
  let bestId: string | undefined
  let bestDeviation = Infinity

  for (const preset of presets) {
    const { start: presetStart, end: presetEnd } = preset.getValue()
    const startDiff = Math.abs(start - presetStart)
    const endDiff = Math.abs(end - presetEnd)

    if (startDiff > toleranceMs || endDiff > toleranceMs) continue

    const deviation = startDiff + endDiff
    if (deviation < bestDeviation) {
      bestDeviation = deviation
      bestId = preset.id
    }
  }

  return bestId
}
