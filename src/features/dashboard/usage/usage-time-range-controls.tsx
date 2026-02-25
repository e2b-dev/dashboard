'use client'

import { cn } from '@/lib/utils'
import { findMatchingPreset } from '@/lib/utils/time-range'
import { formatTimeframeAsISO8601Interval } from '@/lib/utils/timeframe'
import CopyButton from '@/ui/copy-button'
import { Button } from '@/ui/primitives/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { Separator } from '@/ui/primitives/separator'
import { TimeRangePicker, type TimeRangeValues } from '@/ui/time-range-picker'
import { type TimeRangePreset, TimeRangePresets } from '@/ui/time-range-presets'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { TIME_RANGE_PRESETS } from './constants'
import {
  determineSamplingMode,
  normalizeToEndOfSamplingPeriod,
  normalizeToStartOfSamplingPeriod,
} from './sampling-utils'

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
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)

  const selectedPresetId = useMemo(
    () =>
      findMatchingPreset(
        TIME_RANGE_PRESETS,
        timeframe.start,
        timeframe.end,
        1000 * 60 * 60 * 24 // 1 day in tolerance
      ),
    [timeframe.start, timeframe.end]
  )

  const rangeLabel = useMemo(() => {
    const opt: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }

    const firstFormatter = new Intl.DateTimeFormat('en-US', opt)

    const lastFormatter = new Intl.DateTimeFormat('en-US', {
      ...opt,
      timeZoneName: 'short',
    })
    return `${firstFormatter.format(timeframe.start)} - ${lastFormatter.format(timeframe.end)}`
  }, [timeframe.start, timeframe.end])

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
        samplingMode
      ),
      normalizeToEndOfSamplingPeriod(
        timeframe.end - quarterOfRangeDuration,
        samplingMode
      )
    )
  }, [timeframe, quarterOfRangeDuration, onTimeRangeChange])

  const handleNextRange = useCallback(() => {
    const samplingMode = determineSamplingMode(timeframe)

    onTimeRangeChange(
      normalizeToStartOfSamplingPeriod(
        timeframe.start + quarterOfRangeDuration,
        samplingMode
      ),
      normalizeToEndOfSamplingPeriod(
        timeframe.end + quarterOfRangeDuration,
        samplingMode
      )
    )
  }, [timeframe, quarterOfRangeDuration, onTimeRangeChange])

  const handleTimeRangeApply = useCallback(
    (values: TimeRangeValues) => {
      const startTime = values.startTime || '00:00:00'
      const endTime = values.endTime || '23:59:59'

      const startTimestamp = new Date(
        `${values.startDate} ${startTime}`
      ).getTime()
      const endTimestamp = new Date(`${values.endDate} ${endTime}`).getTime()

      onTimeRangeChange(startTimestamp, endTimestamp)
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
        size="sm"
        variant="outline"
        onClick={handlePreviousRange}
        className="border-r-0 px-2"
        title="Move back by one-quarter of the range"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <CopyButton
        value={rangeCopyValue}
        size="sm"
        variant="outline"
        title="Copy ISO 8601 time interval"
        className="border-r-0"
      />
      <Popover open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
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
              minDate={new Date('2023-01-01')}
              onApply={handleTimeRangeApply}
              className="p-3 w-56 max-md:w-full"
            />
            <Separator
              orientation="vertical"
              className="h-auto max-md:hidden"
            />
            <Separator orientation="horizontal" className="w-auto md:hidden" />
            <TimeRangePresets
              presets={TIME_RANGE_PRESETS}
              selectedId={selectedPresetId}
              onSelect={handlePresetSelect}
              className="w-56 max-md:w-full p-3"
            />
          </div>
        </PopoverContent>
      </Popover>
      <Button
        size="sm"
        variant="outline"
        onClick={handleNextRange}
        className="px-2"
        title="Move forward by one-quarter of the range"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
