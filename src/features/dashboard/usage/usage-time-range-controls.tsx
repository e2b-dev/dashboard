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
import { TimeRangePresets, type TimeRangePreset } from '@/ui/time-range-presets'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

interface UsageTimeRangeControlsProps {
  timeframe: {
    start: number
    end: number
  }
  onTimeRangeChange: (start: number, end: number) => void
  className?: string
}

const TIME_RANGE_PRESETS: TimeRangePreset[] = [
  {
    id: 'last-7-days',
    label: 'Last 7 days',
    shortcut: '7D',
    getValue: () => {
      const end = new Date()
      end.setUTCHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 6)
      start.setUTCHours(0, 0, 0, 0)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-14-days',
    label: 'Last 14 days',
    shortcut: '14D',
    getValue: () => {
      const end = new Date()
      end.setUTCHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 13)
      start.setUTCHours(0, 0, 0, 0)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-30-days',
    label: 'Last 30 days',
    shortcut: '30D',
    getValue: () => {
      const end = new Date()
      end.setUTCHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 29)
      start.setUTCHours(0, 0, 0, 0)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-90-days',
    label: 'Last 90 days',
    shortcut: '90D',
    getValue: () => {
      const end = new Date()
      end.setUTCHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 89)
      start.setUTCHours(0, 0, 0, 0)
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'this-month',
    label: 'This month',
    getValue: () => {
      const now = new Date()
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
      )
      const end = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999
        )
      )
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-month',
    label: 'Last month',
    getValue: () => {
      const now = new Date()
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0)
      )
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999)
      )
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'this-year',
    label: 'This year',
    getValue: () => {
      const now = new Date()
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0))
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999)
      )
      return { start: start.getTime(), end: end.getTime() }
    },
  },
  {
    id: 'last-year',
    label: 'Last year',
    getValue: () => {
      const now = new Date()
      const start = new Date(
        Date.UTC(now.getUTCFullYear() - 1, 0, 1, 0, 0, 0, 0)
      )
      const end = new Date(
        Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999)
      )
      return { start: start.getTime(), end: end.getTime() }
    },
  },
]

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
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    return `${formatter.format(timeframe.start)} - ${formatter.format(timeframe.end)}`
  }, [timeframe.start, timeframe.end])

  const rangeCopyValue = useMemo(
    () => formatTimeframeAsISO8601Interval(timeframe.start, timeframe.end),
    [timeframe.start, timeframe.end]
  )

  const thirdOfRangeDuration = useMemo(() => {
    return Math.floor((timeframe.end - timeframe.start) / 3)
  }, [timeframe.start, timeframe.end])

  const handlePreviousRange = useCallback(() => {
    onTimeRangeChange(
      timeframe.start - thirdOfRangeDuration,
      timeframe.end - thirdOfRangeDuration
    )
  }, [timeframe.start, timeframe.end, thirdOfRangeDuration, onTimeRangeChange])

  const handleNextRange = useCallback(() => {
    onTimeRangeChange(
      timeframe.start + thirdOfRangeDuration,
      timeframe.end + thirdOfRangeDuration
    )
  }, [timeframe.start, timeframe.end, thirdOfRangeDuration, onTimeRangeChange])

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
        title="Move back by one-third of the range"
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
              hideTime
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
        title="Move forward by one-third of the range"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
