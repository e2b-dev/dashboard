'use client'

import { CalendarIcon, Clock as ClockIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  formatDateWithSpaces,
  formatTimeWithSpaces,
  tryParseDatetime,
} from '@/lib/utils/formatting'

import { NumberInput } from './number-input'
import { Button } from './primitives/button'
import { Calendar } from './primitives/calendar'
import { Input } from './primitives/input'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'

// reference date for parsing time-only values - actual date doesn't matter
const REFERENCE_DATE = '2024-01-01'

// get timezone identifier in developer-friendly format (e.g., GMT+2, PST, CET)
function getTimezoneIdentifier(): string {
  const date = new Date()

  // try to get timezone abbreviation first (PST, CET, etc.)
  const shortTimeString = date.toLocaleTimeString('en-US', {
    timeZoneName: 'short',
  })
  const match = shortTimeString.match(/\b([A-Z]{2,5})\b$/)

  if (match && match[1] && !match[1].startsWith('GMT')) {
    return match[1]
  }

  // fallback to GMT offset format
  const offset = -date.getTimezoneOffset()
  const hours = Math.floor(Math.abs(offset) / 60)
  const minutes = Math.abs(offset) % 60
  const sign = offset >= 0 ? '+' : '-'

  if (minutes === 0) {
    return `GMT${sign}${hours}`
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

export interface TimeInputProps {
  dateValue: string
  timeValue: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  isLive?: boolean
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
  className,
  minDate,
  maxDate,
}: TimeInputProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)

  // display values allow typing without validation
  const [displayDate, setDisplayDate] = useState(dateValue || '')
  const [displayTime, setDisplayTime] = useState(timeValue || '')

  const selectedDate = tryParseDatetime(dateValue)

  const timeDate = tryParseDatetime(`${REFERENCE_DATE} ${timeValue}`)
  const [hours, setHours] = useState(timeDate ? timeDate.getHours() : 0)
  const [minutes, setMinutes] = useState(timeDate ? timeDate.getMinutes() : 0)
  const [seconds, setSeconds] = useState(timeDate ? timeDate.getSeconds() : 0)

  useEffect(() => {
    setDisplayDate(dateValue || '')
  }, [dateValue])

  useEffect(() => {
    setDisplayTime(timeValue || '')
    const timeDate = tryParseDatetime(`${REFERENCE_DATE} ${timeValue}`)
    if (timeDate) {
      setHours(timeDate.getHours())
      setMinutes(timeDate.getMinutes())
      setSeconds(timeDate.getSeconds())
    }
  }, [timeValue])

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const formattedDate = `${year}/${month}/${day}`

      setDisplayDate(formatDateWithSpaces(date))
      onDateChange(formattedDate)
      setDateOpen(false)
    },
    [onDateChange]
  )

  const handleTimeChange = useCallback(
    (type: 'hours' | 'minutes' | 'seconds', value: number) => {
      if (type === 'hours') setHours(value)
      if (type === 'minutes') setMinutes(value)
      if (type === 'seconds') setSeconds(value)

      const newHours = type === 'hours' ? value : hours
      const newMinutes = type === 'minutes' ? value : minutes
      const newSeconds = type === 'seconds' ? value : seconds

      const formattedTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`
      setDisplayTime(formatTimeWithSpaces(newHours, newMinutes, newSeconds))
      onTimeChange(formattedTime)
    },
    [hours, minutes, seconds, onTimeChange]
  )

  return (
    <div className={cn('flex gap-2 flex-col', className)}>
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
            minDate={minDate}
            maxDate={maxDate}
            autoFocus
          />
        </PopoverContent>
      </Popover>

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
              {getTimezoneIdentifier()}
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

export default TimeInput
