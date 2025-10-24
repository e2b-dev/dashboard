'use client'

import { cn } from '@/lib/utils'
import { formatDay } from '@/lib/utils/formatting'
import { formatTimeframeAsISO8601Interval } from '@/lib/utils/timeframe'
import CopyButton from '@/ui/copy-button'
import { Button } from '@/ui/primitives/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { TimeRangePicker, type TimeRangeValues } from '@/ui/time-range-picker'
import { useCallback, useMemo, useState } from 'react'

interface UsageTimeRangeControlsProps {
  timeframe: {
    start: number
    end: number
  }
  onTimeRangeChange: (start: number, end: number) => void
}

export function UsageTimeRangeControls({
  timeframe,
  onTimeRangeChange,
}: UsageTimeRangeControlsProps) {
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)

  const rangeLabel = useMemo(
    () => `${formatDay(timeframe.start)} - ${formatDay(timeframe.end)}`,
    [timeframe.start, timeframe.end]
  )

  const rangeCopyValue = useMemo(
    () => formatTimeframeAsISO8601Interval(timeframe.start, timeframe.end),
    [timeframe.start, timeframe.end]
  )

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
    <div className="flex items-end">
      <CopyButton
        value={rangeCopyValue}
        size="sm"
        variant="outline"
        title="Copy ISO 8601 time interval"
        className="border-r-0"
      />
      <Popover open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className={cn('prose-label')}>
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
    </div>
  )
}
