'use client'

import { CalendarIcon, Clock as ClockIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { tryParseDatetime } from '@/lib/utils/formatting'

import { NumberInput } from './number-input'
import { Button } from './primitives/button'
import { Calendar } from './primitives/calendar'
import { Input } from './primitives/input'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'

// primitive date/time input component with calendar and time selectors
export interface TimeInputProps {
  dateValue: string
  timeValue: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  isLive?: boolean
  showLiveIndicator?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

export const TimeInput = memo(function TimeInput({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  disabled = false,
  placeholder,
  isLive = false,
  showLiveIndicator = false,
  className,
  minDate,
  maxDate,
}: TimeInputProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)

  // internal state for display values (no validation while typing)
  const [displayDate, setDisplayDate] = useState(dateValue || '')
  const [displayTime, setDisplayTime] = useState(timeValue || '')

  // parse date for calendar selection
  const selectedDate = tryParseDatetime(dateValue)

  // parse time values for time selectors
  const timeDate = tryParseDatetime(`2024-01-01 ${timeValue}`)
  const [hours, setHours] = useState(timeDate ? timeDate.getHours() : 0)
  const [minutes, setMinutes] = useState(timeDate ? timeDate.getMinutes() : 0)
  const [seconds, setSeconds] = useState(timeDate ? timeDate.getSeconds() : 0)

  // sync external value changes
  useEffect(() => {
    setDisplayDate(dateValue || '')
  }, [dateValue])

  useEffect(() => {
    setDisplayTime(timeValue || '')
    const timeDate = tryParseDatetime(`2024-01-01 ${timeValue}`)
    if (timeDate) {
      setHours(timeDate.getHours())
      setMinutes(timeDate.getMinutes())
      setSeconds(timeDate.getSeconds())
    }
  }, [timeValue])

  // format date for display (DD / MM / YYYY)
  const formatDateDisplay = (date: Date | null) => {
    if (!date) return ''
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day} / ${month} / ${year}`
  }

  // format time for display (HH : MM : SS)
  const formatTimeDisplay = (h: string, m: string, s: string) => {
    return `${h} : ${m} : ${s}`
  }

  // handle calendar date selection
  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const formattedDate = `${year}/${month}/${day}`

      setDisplayDate(formatDateDisplay(date))
      onDateChange(formattedDate)
      setDateOpen(false)
    },
    [onDateChange]
  )

  // handle time change
  const handleTimeChange = useCallback(
    (type: 'hours' | 'minutes' | 'seconds', value: number) => {
      // update state based on type
      if (type === 'hours') setHours(value)
      if (type === 'minutes') setMinutes(value)
      if (type === 'seconds') setSeconds(value)

      const newHours = type === 'hours' ? value : hours
      const newMinutes = type === 'minutes' ? value : minutes
      const newSeconds = type === 'seconds' ? value : seconds

      const formattedTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`
      setDisplayTime(
        formatTimeDisplay(
          String(newHours).padStart(2, '0'),
          String(newMinutes).padStart(2, '0'),
          String(newSeconds).padStart(2, '0')
        )
      )
      onTimeChange(formattedTime)
    },
    [hours, minutes, seconds, onTimeChange]
  )

  // calculate default min/max dates if not provided
  const calculatedMinDate =
    minDate ||
    (() => {
      const date = new Date()
      date.setDate(date.getDate() - 31)
      date.setHours(0, 0, 0, 0)
      return date
    })()

  const calculatedMaxDate =
    maxDate ||
    (() => {
      const date = new Date()
      // add 60 seconds tolerance for clock skew
      date.setSeconds(date.getSeconds() + 60)
      return date
    })()

  return (
    <div className={cn('flex gap-2 flex-col', className)}>
      {/* Date input with calendar popover */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <div className="relative flex-1">
          <Input
            type="text"
            value={displayDate || (isLive ? 'today' : '')}
            onChange={(e) => setDisplayDate(e.target.value)}
            onBlur={() => onDateChange(displayDate)}
            placeholder={placeholder || 'YYYY/MM/DD'}
            disabled={disabled}
            className={cn(
              'pr-10 h-10 bg-transparent',
              'border-border-subtle',
              'placeholder:prose-label'
            )}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className=" h-8 w-8"
                tabIndex={-1}
              >
                <CalendarIcon className="size-4 text-fg-tertiary" />
              </Button>
            </PopoverTrigger>
          </div>
        </div>
        <PopoverContent
          className="w-76.5 p-3 translate-x-1 translate-y-1"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateSelect}
            minDate={calculatedMinDate}
            maxDate={calculatedMaxDate}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {/* Time input with time selector popover */}
      <Popover open={timeOpen} onOpenChange={setTimeOpen}>
        <div className="relative flex-1">
          <Input
            type="text"
            value={displayTime || (isLive ? 'now' : '')}
            onChange={(e) => setDisplayTime(e.target.value)}
            onBlur={() => onTimeChange(displayTime)}
            placeholder="HH:MM:SS"
            disabled={disabled}
            className={cn(
              'pr-10 h-10 w-full bg-transparent',
              'placeholder:prose-label'
            )}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <span className="prose-label text-fg-tertiary font-mono">
              {new Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone.split('/')
                .pop()
                ?.replace('_', ' ') || ''}
            </span>

            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                tabIndex={-1}
              >
                <ClockIcon className="size-4 text-fg-tertiary" />
              </Button>
            </PopoverTrigger>
          </div>
        </div>
        <PopoverContent
          className="w-76.5 p-3 translate-x-1 translate-y-1"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <div className="flex items-center w-full justify-center">
            <div className="flex flex-col items-center gap-1">
              <span className="prose-label text-fg-tertiary">Hours</span>
              <NumberInput
                value={hours}
                onChange={(value) => handleTimeChange('hours', value)}
                min={0}
                max={23}
                step={1}
                disabled={disabled}
                inputClassName="h-8 w-11 text-center border-r-0"
                buttonClassName="h-[1rem]"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="prose-label text-fg-tertiary">Minutes</span>
              <NumberInput
                value={minutes}
                onChange={(value) => handleTimeChange('minutes', value)}
                min={0}
                max={59}
                step={1}
                disabled={disabled}
                inputClassName="h-8 w-11 text-center border-r-0"
                buttonClassName="h-[1rem]"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="prose-label text-fg-tertiary">Seconds</span>
              <NumberInput
                value={seconds}
                onChange={(value) => handleTimeChange('seconds', value)}
                min={0}
                max={59}
                step={1}
                disabled={disabled}
                inputClassName="h-8 w-11 text-center"
                buttonClassName="h-[1rem]"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
})

// utility functions for date/time parsing
export function parseDateTime(dateTimeStr: string) {
  if (!dateTimeStr) return { date: '', time: '' }
  const parsed = tryParseDatetime(dateTimeStr)
  if (!parsed) return { date: '', time: '' }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  const seconds = String(parsed.getSeconds()).padStart(2, '0')

  return {
    date: `${year}/${month}/${day}`,
    time: `${hours}:${minutes}:${seconds}`,
  }
}

// utility to combine date and time strings
export function combineDateTime(date: string, time: string) {
  if (!date || !time) return null
  return tryParseDatetime(`${date} ${time}`)
}

export default TimeInput
