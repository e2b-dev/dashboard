/**
 * General-purpose time range selection component
 * A simplified abstraction for picking start and end date/time ranges
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  parseDateTimeComponents,
  tryParseDatetime,
} from '@/lib/utils/formatting'

import { Button } from './primitives/button'
import { Label } from './primitives/label'
import { TimeInput } from './time-input'

export interface TimeRangeValues {
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
}

interface TimeRangePickerProps {
  /** Initial start datetime in any parseable format */
  startDateTime: string
  /** Initial end datetime in any parseable format */
  endDateTime: string
  /** Optional minimum selectable date */
  minDate?: Date
  /** Optional maximum selectable date */
  maxDate?: Date
  /** Called when Apply button is clicked */
  onApply?: (values: TimeRangeValues) => void
  /** Called whenever values change (real-time) */
  onChange?: (values: TimeRangeValues) => void
  /** Custom className for the container */
  className?: string
  /** Hide time inputs and only show date pickers (default: false) */
  hideTime?: boolean
}

export function TimeRangePicker({
  startDateTime,
  endDateTime,
  minDate,
  maxDate,
  onApply,
  onChange,
  className,
  hideTime = false,
}: TimeRangePickerProps) {
  'use no memo'

  const startParts = useMemo(
    () => parseDateTimeComponents(startDateTime),
    [startDateTime]
  )
  const endParts = useMemo(
    () => parseDateTimeComponents(endDateTime),
    [endDateTime]
  )

  const [startDate, setStartDate] = useState(startParts.date || '')
  const [startTime, setStartTime] = useState(startParts.time || null)
  const [endDate, setEndDate] = useState(endParts.date || '')
  const [endTime, setEndTime] = useState(endParts.time || null)

  // track if user has made changes
  const [isDirty, setIsDirty] = useState(false)

  // prevent external updates while user is actively editing
  const [isFocused, setIsFocused] = useState(false)

  // sync with external props (but not when user is editing)
  useEffect(() => {
    if (isDirty || isFocused) {
      return
    }

    const currentStartTime = startDate
      ? tryParseDatetime(`${startDate} ${startTime}`)?.getTime()
      : undefined
    const propStartTime = startDateTime
      ? tryParseDatetime(startDateTime)?.getTime()
      : undefined

    // detect meaningful external changes (>1s difference)
    const isExternalChange =
      propStartTime &&
      currentStartTime &&
      Math.abs(propStartTime - currentStartTime) > 1000

    if (isExternalChange) {
      const newStartParts = parseDateTimeComponents(startDateTime)
      const newEndParts = parseDateTimeComponents(endDateTime)

      setStartDate(newStartParts.date || '')
      setStartTime(newStartParts.time || null)
      setEndDate(newEndParts.date || '')
      setEndTime(newEndParts.time || null)
      setIsDirty(false)
    }
  }, [startDateTime, endDateTime, startDate, startTime, isDirty, isFocused])

  // notify on changes
  useEffect(() => {
    onChange?.({
      startDate,
      startTime,
      endDate,
      endTime,
    })
  }, [startDate, startTime, endDate, endTime, onChange])

  const handleValueChange = useCallback(() => {
    setIsDirty(true)
  }, [])

  const handleApply = useCallback(() => {
    onApply?.({
      startDate,
      startTime,
      endDate,
      endTime,
    })
    setIsDirty(false)
  }, [startDate, startTime, endDate, endTime, onApply])

  return (
    <div className={cn('flex flex-col gap-4 h-full', className)}>
      <div>
        <Label className="prose-label uppercase text-fg-tertiary mb-2 block">
          Start Time
        </Label>
        <div className="flex gap-2">
          <div
            className="flex-1"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <TimeInput
              dateValue={startDate}
              timeValue={startTime || ''}
              minDate={minDate}
              maxDate={maxDate}
              onDateChange={(value) => {
                setStartDate(value)
                handleValueChange()
              }}
              onTimeChange={(value) => {
                setStartTime(value || null)
                handleValueChange()
              }}
              disabled={false}
              hideTime={hideTime}
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="prose-label uppercase text-fg-tertiary mb-2 block">
          End Time
        </Label>
        <div className="flex gap-2">
          <div
            className="flex-1"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <TimeInput
              dateValue={endDate}
              timeValue={endTime || ''}
              minDate={minDate}
              maxDate={maxDate}
              onDateChange={(value) => {
                setEndDate(value)
                handleValueChange()
              }}
              onTimeChange={(value) => {
                setEndTime(value || null)
                handleValueChange()
              }}
              disabled={false}
              hideTime={hideTime}
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleApply}
        disabled={!isDirty}
        className="w-fit self-end mt-auto"
        variant="outline"
      >
        Apply
      </Button>
    </div>
  )
}
