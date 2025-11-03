import type { TimeRangePreset } from '@/ui/time-range-presets'

/**
 * Finds which preset matches the given timeframe (with tolerance)
 */
export function findMatchingPreset(
  presets: TimeRangePreset[],
  start: number,
  end: number,
  toleranceMs = 10 * 1000 // 10 seconds
): string | undefined {
  for (const preset of presets) {
    const { start: presetStart, end: presetEnd } = preset.getValue()

    if (
      Math.abs(start - presetStart) <= toleranceMs &&
      Math.abs(end - presetEnd) <= toleranceMs
    ) {
      return preset.id
    }
  }

  return undefined
}
