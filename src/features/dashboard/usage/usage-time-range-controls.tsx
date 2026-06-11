'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  formatZonedDateRange,
  useTimezone,
} from '@/features/dashboard/timezone'
import { cn } from '@/lib/utils'
import { findMatchingPreset } from '@/lib/utils/time-range'
import { formatTimeframeAsISO8601Interval } from '@/lib/utils/timeframe'
import CopyButton from '@/ui/copy-button'
import { Button } from '@/ui/primitives/button'
import { ChevronLeftIcon, ChevronRightIcon } from '@/ui/primitives/icons'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { Separator } from '@/ui/primitives/separator'
import { TimeRangePicker } from '@/ui/time-range-picker'
import { type TimeRangePreset, TimeRangePresets } from '@/ui/time-range-presets'
import { getUsageTimeRangePresets } from './constants'
import {
  determineSamplingMode,
  normalizeToEndOfSamplingPeriod,
  normalizeToStartOfSamplingPeriod,
} from './sampling-utils'

const USAGE_TIME_RANGE_BOUNDS = {
  min: new Date('2023-01-01'),
}

interface UsageTimeRangeControlsProps {
  timeframe: {
    start: number
    end: number
  }
  onTimeRangeChange: (start: number, end: number) => void
  className?: string
}

export function UsageTimeRangeControls({
  timeframe,
  onTimeRangeChange,
  className,
}: UsageTimeRangeControlsProps) {
  const { timezone } = useTimezone()
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const lastMatchedPresetIdRef = useRef<string | undefined>(undefined)
  const previousTimezoneRef = useRef(timezone)

  const timeRangePresets = useMemo(
    () => getUsageTimeRangePresets(timezone),
    [timezone]
  )

  const selectedPresetId = useMemo(
    () =>
      findMatchingPreset(
        timeRangePresets,
        timeframe.start,
        timeframe.end,
        1000 * 60 * 60 * 24 // 1 day in tolerance
      ),
    [timeRangePresets, timeframe.start, timeframe.end]
  )

  useEffect(() => {
    if (previousTimezoneRef.current === timezone) return

    previousTimezoneRef.current = timezone
    const presetId = selectedPresetId ?? lastMatchedPresetIdRef.current
    if (!presetId) return

    const preset = timeRangePresets.find((option) => option.id === presetId)
    if (!preset) return

    const { start, end } = preset.getValue()
    if (start === timeframe.start && end === timeframe.end) return

    onTimeRangeChange(start, end)
  }, [
    onTimeRangeChange,
    selectedPresetId,
    timeframe.end,
    timeframe.start,
    timeRangePresets,
    timezone,
  ])

  useEffect(() => {
    lastMatchedPresetIdRef.current = selectedPresetId
  }, [selectedPresetId])

  const rangeLabel = useMemo(() => {
    return formatZonedDateRange(timeframe.start, timeframe.end, timezone)
  }, [timeframe.start, timeframe.end, timezone])

  const rangeCopyValue = useMemo(
    () => formatTimeframeAsISO8601Interval(timeframe.start, timeframe.end),
    [timeframe.start, timeframe.end]
  )

  const quarterOfRangeDuration = useMemo(() => {
    return Math.floor((timeframe.end - timeframe.start) / 4)
  }, [timeframe.start, timeframe.end])

  const handlePreviousRange = useCallback(() => {
    const samplingMode = determineSamplingMode(timeframe)

    onTimeRangeChange(
      normalizeToStartOfSamplingPeriod(
        timeframe.start - quarterOfRangeDuration,
        samplingMode,
        timezone
      ),
      normalizeToEndOfSamplingPeriod(
        timeframe.end - quarterOfRangeDuration,
        samplingMode,
        timezone
      )
    )
  }, [timeframe, quarterOfRangeDuration, onTimeRangeChange, timezone])

  const handleNextRange = useCallback(() => {
    const samplingMode = determineSamplingMode(timeframe)

    onTimeRangeChange(
      normalizeToStartOfSamplingPeriod(
        timeframe.start + quarterOfRangeDuration,
        samplingMode,
        timezone
      ),
      normalizeToEndOfSamplingPeriod(
        timeframe.end + quarterOfRangeDuration,
        samplingMode,
        timezone
      )
    )
  }, [timeframe, quarterOfRangeDuration, onTimeRangeChange, timezone])

  const handleTimeRangeApply = useCallback(
    (start: number, end: number) => {
      onTimeRangeChange(start, end)
      setIsTimePickerOpen(false)
    },
    [onTimeRangeChange]
  )

  const handlePresetSelect = useCallback(
    (preset: TimeRangePreset) => {
      const { start, end } = preset.getValue()
      onTimeRangeChange(start, end)
      setIsTimePickerOpen(false)
    },
    [onTimeRangeChange]
  )

  return (
    <div className={cn('flex items-end', className)}>
      <Button
        variant="secondary"
        onClick={handlePreviousRange}
        className="border-r-0 px-2"
        title="Move back by one-quarter of the range"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>
      <CopyButton
        value={rangeCopyValue}
        variant="secondary"
        title="Copy ISO 8601 time interval"
        className="border-r-0"
      />
      <Popover open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            className={cn('prose-label font-sans', 'border-r-0')}
          >
            {rangeLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 max-md:w-[calc(100vw-2rem)]"
          side="bottom"
          sideOffset={4}
        >
          <div className="flex max-md:flex-col max-h-[500px] max-md:max-h-[600px]">
            <TimeRangePicker
              startDateTime={new Date(timeframe.start).toISOString()}
              endDateTime={new Date(timeframe.end).toISOString()}
              bounds={USAGE_TIME_RANGE_BOUNDS}
              onApplyTimestamps={handleTimeRangeApply}
              className="p-3 w-56 max-md:w-full"
            />
            <Separator
              orientation="vertical"
              className="h-auto max-md:hidden"
            />
            <Separator orientation="horizontal" className="w-auto md:hidden" />
            <TimeRangePresets
              presets={timeRangePresets}
              selectedId={selectedPresetId}
              onSelect={handlePresetSelect}
              className="w-56 max-md:w-full p-3"
            />
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="secondary"
        onClick={handleNextRange}
        className="px-2"
        title="Move forward by one-quarter of the range"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
