'use client'

import { cn } from '@/lib/utils'
import { formatTimeframeAsISO8601Interval } from '@/lib/utils/timeframe'
import CopyButton from '@/ui/copy-button'
import { Button } from '@/ui/primitives/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { TimeRangePicker, type TimeRangeValues } from '@/ui/time-range-picker'
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

export function UsageTimeRangeControls({
  timeframe,
  onTimeRangeChange,
  className,
}: UsageTimeRangeControlsProps) {
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)

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
            className={cn('prose-label', 'border-r-0')}
          >
            {rangeLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <TimeRangePicker
            startDateTime={new Date(timeframe.start).toISOString()}
            endDateTime={new Date(timeframe.end).toISOString()}
            onApply={handleTimeRangeApply}
            hideTime
          />
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
