'use client'

import { millisecondsInHour, millisecondsInMinute } from 'date-fns/constants'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { TimeRangePicker, type TimeRangeValues } from '@/ui/time-range-picker'
import { parseTimeRangeValuesToTimestamps } from '@/ui/time-range-picker.logic'
import { type TimeRangePreset, TimeRangePresets } from '@/ui/time-range-presets'
import {
  SANDBOX_MONITORING_FIRST_5_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_FIRST_5_MINUTES_PRESET_SHORTCUT,
  SANDBOX_MONITORING_FIRST_15_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_FIRST_15_MINUTES_PRESET_SHORTCUT,
  SANDBOX_MONITORING_FIRST_HOUR_PRESET_ID,
  SANDBOX_MONITORING_FIRST_HOUR_PRESET_SHORTCUT,
  SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_ID,
  SANDBOX_MONITORING_FULL_LIFECYCLE_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_5_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_LAST_5_MINUTES_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_6_HOURS_PRESET_ID,
  SANDBOX_MONITORING_LAST_6_HOURS_PRESET_SHORTCUT,
  SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_ID,
  SANDBOX_MONITORING_LAST_15_MINUTES_PRESET_SHORTCUT,
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

interface TimeRangeHistoryEntry {
  start: number
  end: number
  isLiveUpdating: boolean
}

interface TimeRangeHistoryState {
  entries: TimeRangeHistoryEntry[]
  index: number
}

function isSameHistoryEntry(
  a: TimeRangeHistoryEntry | undefined,
  b: TimeRangeHistoryEntry
): boolean {
  if (!a) {
    return false
  }

  return (
    a.start === b.start &&
    a.end === b.end &&
    a.isLiveUpdating === b.isLiveUpdating
  )
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
  const [historyState, setHistoryState] = useState<TimeRangeHistoryState>(
    () => ({
      entries: [
        {
          start: timeframe.start,
          end: timeframe.end,
          isLiveUpdating,
        },
      ],
      index: 0,
    })
  )
  const isHistoryNavigationRef = useRef(false)

  const clampToLifecycle = useCallback(
    (start: number, end: number) => {
      const maxBoundMs = lifecycle.isRunning
        ? Date.now()
        : lifecycle.anchorEndMs

      return clampTimeframeToBounds(start, end, lifecycle.startMs, maxBoundMs)
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
        SANDBOX_MONITORING_FIRST_5_MINUTES_PRESET_ID,
        'First 5 min',
        SANDBOX_MONITORING_FIRST_5_MINUTES_PRESET_SHORTCUT,
        5 * millisecondsInMinute
      ),
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

  useEffect(() => {
    const snapshot: TimeRangeHistoryEntry = {
      start: timeframe.start,
      end: timeframe.end,
      isLiveUpdating,
    }

    setHistoryState((previous) => {
      const currentEntry = previous.entries[previous.index]

      if (isSameHistoryEntry(currentEntry, snapshot)) {
        isHistoryNavigationRef.current = false
        return previous
      }

      if (isHistoryNavigationRef.current) {
        isHistoryNavigationRef.current = false
        const nextEntries = [...previous.entries]
        nextEntries[previous.index] = snapshot
        return {
          entries: nextEntries,
          index: previous.index,
        }
      }

      if (currentEntry?.isLiveUpdating && snapshot.isLiveUpdating) {
        return previous
      }

      const trimmedEntries = previous.entries.slice(0, previous.index + 1)
      const lastEntry = trimmedEntries[trimmedEntries.length - 1]
      if (isSameHistoryEntry(lastEntry, snapshot)) {
        return {
          entries: trimmedEntries,
          index: trimmedEntries.length - 1,
        }
      }

      return {
        entries: [...trimmedEntries, snapshot],
        index: trimmedEntries.length,
      }
    })
  }, [isLiveUpdating, timeframe.end, timeframe.start])

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
  }, [isLiveUpdating, lifecycle.isRunning, onLiveChange])

  const canGoBackward = historyState.index > 0
  const canGoForward = historyState.index < historyState.entries.length - 1

  const handleHistoryNavigation = useCallback(
    (targetIndex: number) => {
      const target = historyState.entries[targetIndex]
      if (!target) {
        return
      }

      isHistoryNavigationRef.current = true
      setHistoryState((previous) => ({
        entries: previous.entries,
        index: targetIndex,
      }))
      onTimeRangeChange(target.start, target.end, {
        isLiveUpdating: target.isLiveUpdating,
      })
    },
    [historyState.entries, onTimeRangeChange]
  )

  const handleGoBackward = useCallback(() => {
    if (!canGoBackward) {
      return
    }

    handleHistoryNavigation(historyState.index - 1)
  }, [canGoBackward, handleHistoryNavigation, historyState.index])

  const handleGoForward = useCallback(() => {
    if (!canGoForward) {
      return
    }

    handleHistoryNavigation(historyState.index + 1)
  }, [canGoForward, handleHistoryNavigation, historyState.index])

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button size="md" variant="outline" className="prose-label font-sans">
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
            <Separator
              orientation="vertical"
              className="h-auto max-md:hidden"
            />
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

      <Button
        size="md"
        variant="outline"
        onClick={handleLiveToggle}
        className="prose-label font-sans"
      >
        <LiveDot paused={!isLiveUpdating || !lifecycle.isRunning} />
        {isLiveUpdating && lifecycle.isRunning ? 'Live' : 'Paused'}
      </Button>

      <div className="flex items-center gap-1">
        <Button
          size="md"
          variant="outline"
          onClick={handleGoBackward}
          disabled={!canGoBackward}
          className="w-9 p-0"
          title="Go to previous timeframe"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          size="md"
          variant="outline"
          onClick={handleGoForward}
          disabled={!canGoForward}
          className="w-9 p-0"
          title="Go to next timeframe"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
