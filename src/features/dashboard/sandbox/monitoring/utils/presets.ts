import { millisecondsInMinute } from 'date-fns/constants'
import type { TimeRangePreset } from '@/ui/time-range-presets'
import {
  SANDBOX_MONITORING_FIRST_1_MINUTE_PRESET_ID,
  SANDBOX_MONITORING_FIRST_1_MINUTE_PRESET_SHORTCUT,
  SANDBOX_MONITORING_FIRST_5_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_FIRST_5_MINUTES_PRESET_SHORTCUT,
  SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_ID,
  SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_1_MINUTE_PRESET_ID,
  SANDBOX_MONITORING_LAST_1_MINUTE_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_5_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_LAST_5_MINUTES_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_30_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_LAST_30_MINUTES_PRESET_SHORTCUT,
} from './constants'
import {
  clampTimeframeToBounds,
  computeLifecyclePadding,
  type SandboxLifecycleBounds,
} from './timeframe'

const SANDBOX_MONITORING_LEADING_PRESET_DURATIONS: ReadonlyArray<{
  id: string
  label: string
  shortcut: string
  rangeMs: number
}> = [
  {
    id: SANDBOX_MONITORING_FIRST_1_MINUTE_PRESET_ID,
    label: 'First 1 min',
    shortcut: SANDBOX_MONITORING_FIRST_1_MINUTE_PRESET_SHORTCUT,
    rangeMs: millisecondsInMinute,
  },
  {
    id: SANDBOX_MONITORING_FIRST_5_MINUTES_PRESET_ID,
    label: 'First 5 min',
    shortcut: SANDBOX_MONITORING_FIRST_5_MINUTES_PRESET_SHORTCUT,
    rangeMs: 5 * millisecondsInMinute,
  },
]

export function getMonitoringPresets(
  lifecycle: SandboxLifecycleBounds
): TimeRangePreset[] {
  const clampToLifecycle = (start: number, end: number, paddingMs: number) => {
    const maxBoundMs = lifecycle.isRunning ? Date.now() : lifecycle.anchorEndMs

    return clampTimeframeToBounds(
      start,
      end,
      lifecycle.startMs - paddingMs,
      maxBoundMs + paddingMs
    )
  }

  const makeTrailing = (
    id: string,
    label: string,
    shortcut: string,
    rangeMs: number
  ): TimeRangePreset => ({
    id,
    label,
    shortcut,
    getValue: () => {
      const anchorEndMs = lifecycle.isRunning
        ? Date.now()
        : lifecycle.anchorEndMs
      const lifecycleDuration = anchorEndMs - lifecycle.startMs
      const effectiveRange = Math.min(rangeMs, lifecycleDuration)
      const padding = computeLifecyclePadding(effectiveRange)

      return clampToLifecycle(
        anchorEndMs - effectiveRange,
        anchorEndMs + padding,
        padding
      )
    },
  })

  const makeLeading = (
    id: string,
    label: string,
    shortcut: string,
    rangeMs: number
  ): TimeRangePreset => ({
    id,
    label,
    shortcut,
    getValue: () => {
      const padding = computeLifecyclePadding(rangeMs)
      return {
        start: lifecycle.startMs - padding,
        end: lifecycle.startMs + rangeMs,
      }
    },
  })

  return [
    {
      id: SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_ID,
      label: lifecycle.isRunning ? 'From start to now' : 'Full lifecycle',
      shortcut: SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_SHORTCUT,
      getValue: () => {
        const anchorEndMs = lifecycle.isRunning
          ? Date.now()
          : lifecycle.anchorEndMs
        const duration = anchorEndMs - lifecycle.startMs
        const padding = computeLifecyclePadding(duration)
        return clampToLifecycle(
          lifecycle.startMs - padding,
          anchorEndMs + padding,
          padding
        )
      },
    },
    ...SANDBOX_MONITORING_LEADING_PRESET_DURATIONS.map((p) =>
      makeLeading(p.id, p.label, p.shortcut, p.rangeMs)
    ),
    makeTrailing(
      SANDBOX_MONITORING_LAST_1_MINUTE_PRESET_ID,
      'Last 1 min',
      SANDBOX_MONITORING_LAST_1_MINUTE_PRESET_SHORTCUT,
      millisecondsInMinute
    ),
    makeTrailing(
      SANDBOX_MONITORING_LAST_5_MINUTES_PRESET_ID,
      'Last 5 min',
      SANDBOX_MONITORING_LAST_5_MINUTES_PRESET_SHORTCUT,
      5 * millisecondsInMinute
    ),
    makeTrailing(
      SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_ID,
      'Last 15 min',
      SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_SHORTCUT,
      15 * millisecondsInMinute
    ),
    makeTrailing(
      SANDBOX_MONITORING_LAST_30_MINUTES_PRESET_ID,
      'Last 30 min',
      SANDBOX_MONITORING_LAST_30_MINUTES_PRESET_SHORTCUT,
      30 * millisecondsInMinute
    ),
  ]
}

export function findPresetById(
  presets: TimeRangePreset[],
  id: string
): TimeRangePreset | undefined {
  return presets.find((p) => p.id === id)
}
