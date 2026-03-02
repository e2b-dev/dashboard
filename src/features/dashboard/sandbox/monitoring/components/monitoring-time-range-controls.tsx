'use client'

import { cn } from '@/lib/utils'
import { findMatchingPreset } from '@/lib/utils/time-range'
import { LiveDot } from '@/ui/live'
import { Button } from '@/ui/primitives/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { Separator } from '@/ui/primitives/separator'
import { parseTimeRangeValuesToTimestamps } from '@/ui/time-range-picker.logic'
import { TimeRangePicker, type TimeRangeValues } from '@/ui/time-range-picker'
import { TimeRangePresets, type TimeRangePreset } from '@/ui/time-range-presets'
import {
  millisecondsInHour,
  millisecondsInMinute,
} from 'date-fns/constants'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  SANDBOX_MONITORING_FIRST_15_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_FIRST_15_MINUTES_PRESET_SHORTCUT,
  SANDBOX_MONITORING_FIRST_HOUR_PRESET_ID,
  SANDBOX_MONITORING_FIRST_HOUR_PRESET_SHORTCUT,
  SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_ID,
  SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_6_HOURS_PRESET_ID,
  SANDBOX_MONITORING_LAST_6_HOURS_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_HOUR_PRESET_ID,
  SANDBOX_MONITORING_LAST_HOUR_PRESET_SHORTCUT,
  SANDBOX_MONITORING_PRESET_MATCH_TOLERANCE_MS,
  SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS,
} from '../utils/constants'
import {
  clampTimeframeToBounds,
  type SandboxLifecycleBounds,
} from '../utils/timeframe'

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime())
}

function toSafeIsoDateTime(
  timestampMs: number,
  fallbackTimestampMs: number = Date.now()
): string {
  const candidate = new Date(timestampMs)
  if (isValidDate(candidate)) {
    return candidate.toISOString()
  }

  return new Date(fallbackTimestampMs).toISOString()
}

interface SandboxMonitoringTimeRangeControlsProps {
  timeframe: {
    start: number
    end: number
  }
  lifecycle: SandboxLifecycleBounds
  isLiveUpdating: boolean
  onLiveChange: (isLiveUpdating: boolean) => void
  onTimeRangeChange: (
    start: number,
    end: number,
    options?: { isLiveUpdating?: boolean }
  ) => void
  className?: string
}

export default function SandboxMonitoringTimeRangeControls({
  timeframe,
  lifecycle,
  isLiveUpdating,
  onLiveChange,
  onTimeRangeChange,
  className,
}: SandboxMonitoringTimeRangeControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pickerMaxDateMs, setPickerMaxDateMs] = useState(() => Date.now())

  const clampToLifecycle = useCallback(
    (start: number, end: number) => {
      const maxBoundMs = lifecycle.isRunning
        ? Date.now()
        : lifecycle.anchorEndMs

      return clampTimeframeToBounds(
        start,
        end,
        lifecycle.startMs,
        maxBoundMs
      )
    },
    [lifecycle.anchorEndMs, lifecycle.isRunning, lifecycle.startMs]
  )

  const presets = useMemo<TimeRangePreset[]>(() => {
    const makeTrailing = (
      id: string,
      label: string,
      shortcut: string,
      rangeMs: number
    ): TimeRangePreset => ({
      id,
      label,
      shortcut,
      isLiveUpdating: lifecycle.isRunning,
      getValue: () => {
        const anchorEndMs = lifecycle.isRunning
          ? Date.now()
          : lifecycle.anchorEndMs
        const lifecycleDuration = anchorEndMs - lifecycle.startMs

        return clampToLifecycle(
          anchorEndMs - Math.min(rangeMs, lifecycleDuration),
          anchorEndMs
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
      isLiveUpdating: false,
      getValue: () => {
        const anchorEndMs = lifecycle.isRunning
          ? Date.now()
          : lifecycle.anchorEndMs
        const lifecycleDuration = anchorEndMs - lifecycle.startMs

        return clampToLifecycle(
          lifecycle.startMs,
          lifecycle.startMs + Math.min(rangeMs, lifecycleDuration)
        )
      },
    })

    return [
      {
        id: SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_ID,
        label: lifecycle.isRunning ? 'From start to now' : 'Full lifecycle',
        shortcut: SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_SHORTCUT,
        isLiveUpdating: lifecycle.isRunning,
        getValue: () => {
          const anchorEndMs = lifecycle.isRunning
            ? Date.now()
            : lifecycle.anchorEndMs
          return clampToLifecycle(lifecycle.startMs, anchorEndMs)
        },
      },
      makeLeading(
        SANDBOX_MONITORING_FIRST_15_MINUTES_PRESET_ID,
        'First 15 min',
        SANDBOX_MONITORING_FIRST_15_MINUTES_PRESET_SHORTCUT,
        15 * millisecondsInMinute
      ),
      makeLeading(
        SANDBOX_MONITORING_FIRST_HOUR_PRESET_ID,
        'First 1 hour',
        SANDBOX_MONITORING_FIRST_HOUR_PRESET_SHORTCUT,
        millisecondsInHour
      ),
      makeTrailing(
        SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_ID,
        'Last 15 min',
        SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_SHORTCUT,
        15 * millisecondsInMinute
      ),
      makeTrailing(
        SANDBOX_MONITORING_LAST_HOUR_PRESET_ID,
        'Last 1 hour',
        SANDBOX_MONITORING_LAST_HOUR_PRESET_SHORTCUT,
        millisecondsInHour
      ),
      makeTrailing(
        SANDBOX_MONITORING_LAST_6_HOURS_PRESET_ID,
        'Last 6 hours',
        SANDBOX_MONITORING_LAST_6_HOURS_PRESET_SHORTCUT,
        6 * millisecondsInHour
      ),
    ]
  }, [
    clampToLifecycle,
    lifecycle.anchorEndMs,
    lifecycle.isRunning,
    lifecycle.startMs,
  ])

  const selectedPresetId = useMemo(
    () =>
      findMatchingPreset(
        presets,
        timeframe.start,
        timeframe.end,
        SANDBOX_MONITORING_PRESET_MATCH_TOLERANCE_MS
      ),
    [presets, timeframe.end, timeframe.start]
  )

  const rangeLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(
      undefined,
      SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS
    )

    const startDate = new Date(timeframe.start)
    const endDate = new Date(timeframe.end)
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return '--'
    }

    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`
  }, [timeframe.end, timeframe.start])

  useEffect(() => {
    if (isOpen && lifecycle.isRunning) {
      setPickerMaxDateMs(Date.now())
    }
  }, [isOpen, lifecycle.isRunning])

  const pickerMaxDate = useMemo(
    () =>
      lifecycle.isRunning
        ? new Date(pickerMaxDateMs)
        : new Date(lifecycle.anchorEndMs),
    [lifecycle.anchorEndMs, lifecycle.isRunning, pickerMaxDateMs]
  )

  const pickerBounds = useMemo(
    () => ({
      min: new Date(lifecycle.startMs),
      max: pickerMaxDate,
    }),
    [lifecycle.startMs, pickerMaxDate]
  )

  const handlePresetSelect = useCallback(
    (preset: TimeRangePreset) => {
      const { start, end } = preset.getValue()
      onTimeRangeChange(start, end, {
        isLiveUpdating: preset.isLiveUpdating,
      })
      setIsOpen(false)
    },
    [onTimeRangeChange]
  )

  const handleApply = useCallback(
    (values: TimeRangeValues) => {
      const timestamps = parseTimeRangeValuesToTimestamps(values)
      if (!timestamps) {
        return
      }

      const next = clampToLifecycle(timestamps.start, timestamps.end)

      onTimeRangeChange(next.start, next.end, {
        isLiveUpdating: false,
      })
      setIsOpen(false)
    },
    [clampToLifecycle, onTimeRangeChange]
  )

  const handleLiveToggle = useCallback(() => {
    if (!lifecycle.isRunning) {
      onLiveChange(false)
      return
    }

    onLiveChange(!isLiveUpdating)
  }, [
    isLiveUpdating,
    lifecycle.isRunning,
    onLiveChange,
  ])

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={handleLiveToggle}
        className="prose-label font-sans h-8"
      >
        <LiveDot paused={!isLiveUpdating || !lifecycle.isRunning} />
        {isLiveUpdating && lifecycle.isRunning ? 'Live' : 'Paused'}
      </Button>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="prose-label font-sans h-8"
          >
            {rangeLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 max-md:w-[calc(100vw-2rem)]">
          <div className="flex max-md:flex-col max-h-[500px] max-md:max-h-[600px]">
            <TimeRangePicker
              startDateTime={toSafeIsoDateTime(timeframe.start, timeframe.end)}
              endDateTime={toSafeIsoDateTime(timeframe.end)}
              bounds={pickerBounds}
              onApply={handleApply}
              className="p-3 w-56 max-md:w-full"
            />
            <Separator orientation="vertical" className="h-auto max-md:hidden" />
            <Separator orientation="horizontal" className="w-auto md:hidden" />
            <TimeRangePresets
              presets={presets}
              selectedId={selectedPresetId}
              onSelect={handlePresetSelect}
              className="w-56 max-md:w-full p-3"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
