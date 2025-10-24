/**
 * General-purpose time range selection component
 * A simplified abstraction for picking start and end date/time ranges
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  parseDateTimeComponents,
  tryParseDatetime,
} from '@/lib/utils/formatting'

import { Button } from './primitives/button'
import { Checkbox } from './primitives/checkbox'
import { Label } from './primitives/label'
import { TimeInput } from './time-input'

export interface TimeRangeValues {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  endEnabled: boolean
}

interface TimeRangePickerProps {
  /** Initial start datetime in any parseable format */
  startDateTime: string
  /** Initial end datetime in any parseable format */
  endDateTime: string
  /** Whether the end time is initially enabled */
  endEnabled: boolean
  /** Optional minimum selectable date */
  minDate?: Date
  /** Optional maximum selectable date */
  maxDate?: Date
  /** Called when Apply button is clicked */
  onApply?: (values: TimeRangeValues) => void
  /** Called whenever values change (real-time) */
  onChange?: (values: TimeRangeValues) => void
  /** Show the Apply button (default: true) */
  showApplyButton?: boolean
  /** Custom className for the container */
  className?: string
}

export function TimeRangePicker({
  startDateTime,
  endDateTime,
  endEnabled: initialEndEnabled,
  minDate,
  maxDate,
  onApply,
  onChange,
  showApplyButton = true,
  className,
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
  const [startTime, setStartTime] = useState(startParts.time || '')
  const [endDate, setEndDate] = useState(endParts.date || '')
  const [endTime, setEndTime] = useState(endParts.time || '')
  const [endEnabled, setEndEnabled] = useState(initialEndEnabled || false)

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

    if (isExternalChange || endEnabled !== initialEndEnabled) {
      const newStartParts = parseDateTimeComponents(startDateTime)
      const newEndParts = parseDateTimeComponents(endDateTime)

      setStartDate(newStartParts.date || '')
      setStartTime(newStartParts.time || '')
      setEndDate(newEndParts.date || '')
      setEndTime(newEndParts.time || '')
      setEndEnabled(initialEndEnabled || false)
      setIsDirty(false)
    }
  }, [
    startDateTime,
    endDateTime,
    initialEndEnabled,
    startDate,
    startTime,
    endEnabled,
    isDirty,
    isFocused,
  ])

  // notify on changes
  useEffect(() => {
    onChange?.({
      startDate,
      startTime,
      endDate,
      endTime,
      endEnabled,
    })
  }, [startDate, startTime, endDate, endTime, endEnabled, onChange])

  const handleValueChange = useCallback(() => {
    setIsDirty(true)
  }, [])

  const handleApply = useCallback(() => {
    onApply?.({
      startDate,
      startTime,
      endDate,
      endTime,
      endEnabled,
    })
    setIsDirty(false)
  }, [startDate, startTime, endDate, endTime, endEnabled, onApply])

  return (
    <div className={className ?? 'p-4 flex flex-col gap-4 h-full'}>
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
              timeValue={startTime}
              minDate={minDate}
              maxDate={maxDate}
              onDateChange={(value) => {
                setStartDate(value)
                handleValueChange()
              }}
              onTimeChange={(value) => {
                setStartTime(value)
                handleValueChange()
              }}
              disabled={false}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="prose-label uppercase text-fg-tertiary">
            End Time
          </Label>
          <Checkbox
            checked={endEnabled}
            onCheckedChange={(checked) => {
              setEndEnabled(!!checked)
              handleValueChange()
            }}
          />
        </div>
        <div className={!endEnabled ? 'opacity-50' : ''}>
          <div className="flex gap-2">
            <div
              className="flex-1"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            >
              <TimeInput
                dateValue={endDate || ''}
                timeValue={endTime || ''}
                minDate={minDate}
                maxDate={maxDate}
                onDateChange={(value) => {
                  setEndDate(value)
                  handleValueChange()
                }}
                onTimeChange={(value) => {
                  setEndTime(value)
                  handleValueChange()
                }}
                disabled={!endEnabled}
                isLive={!endEnabled}
              />
            </div>
          </div>
        </div>
      </div>

      {showApplyButton && (
        <Button
          onClick={handleApply}
          disabled={!isDirty}
          className="w-fit self-end mt-auto"
          variant="outline"
        >
          Apply
        </Button>
      )}
    </div>
  )
}
