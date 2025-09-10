'use client'

import { Calendar as CalendarIcon, XCircle } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { tryParseDatetime } from '@/lib/utils/formatting'

import CopyButton from './copy-button'
import { LiveDot } from './live'
import { Calendar } from './primitives/calendar'
import { Input } from './primitives/input'
import { Label } from './primitives/label'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'
import { Separator } from './primitives/separator'

interface DateTimeInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  isLive?: boolean
  showLiveIndicator?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
  maxDaysInPast?: number // default: 31 days
}

export const DateTimeInput = memo(function DateTimeInput({
  value,
  onChange,
  disabled,
  placeholder,
  isLive = false,
  showLiveIndicator = false,
  className,
  minDate,
  maxDate,
  maxDaysInPast = 31,
}: DateTimeInputProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const date = tryParseDatetime(value)
    return date || undefined
  })
  const [hours, setHours] = useState('00')
  const [minutes, setMinutes] = useState('00')
  const [seconds, setSeconds] = useState('00')

  // calculate default min/max dates if not provided
  const calculatedMinDate =
    minDate ||
    (() => {
      const date = new Date()
      date.setDate(date.getDate() - maxDaysInPast)
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

  // validate and parse date
  const isValidDate = !!inputValue && !!tryParseDatetime(inputValue)
  const date = tryParseDatetime(inputValue)
  const isoTimestamp = date?.toISOString() || ''

  // sync external value changes
  useEffect(() => {
    if (value !== inputValue && value !== '') {
      setInputValue(value)
      const date = tryParseDatetime(value)
      if (date) {
        setSelectedDate(date)
        setHours(String(date.getHours()).padStart(2, '0'))
        setMinutes(String(date.getMinutes()).padStart(2, '0'))
        setSeconds(String(date.getSeconds()).padStart(2, '0'))
      }
    }
  }, [value, inputValue])

  // handle direct text input
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      onChange(newValue)

      // update calendar if valid date
      const date = tryParseDatetime(newValue)
      if (date) {
        setSelectedDate(date)
        setHours(String(date.getHours()).padStart(2, '0'))
        setMinutes(String(date.getMinutes()).padStart(2, '0'))
        setSeconds(String(date.getSeconds()).padStart(2, '0'))
      }
    },
    [onChange]
  )

  // handle calendar date selection
  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return

      // combine date with current time values
      const newDate = new Date(date)
      newDate.setHours(parseInt(hours, 10))
      newDate.setMinutes(parseInt(minutes, 10))
      newDate.setSeconds(parseInt(seconds, 10))

      setSelectedDate(newDate)

      // format as YYYY-MM-DD HH:mm:ss for consistency
      const year = newDate.getFullYear()
      const month = String(newDate.getMonth() + 1).padStart(2, '0')
      const day = String(newDate.getDate()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

      setInputValue(formattedDate)
      onChange(formattedDate)
    },
    [hours, minutes, seconds, onChange]
  )

  // handle time changes
  const handleTimeChange = useCallback(
    (type: 'hours' | 'minutes' | 'seconds', value: string) => {
      const numValue = parseInt(value, 10)

      // validate ranges
      if (type === 'hours' && (numValue < 0 || numValue > 23)) return
      if (type === 'minutes' && (numValue < 0 || numValue > 59)) return
      if (type === 'seconds' && (numValue < 0 || numValue > 59)) return

      const paddedValue = String(numValue).padStart(2, '0')

      if (type === 'hours') setHours(paddedValue)
      if (type === 'minutes') setMinutes(paddedValue)
      if (type === 'seconds') setSeconds(paddedValue)

      // update date if we have a selected date
      if (selectedDate) {
        const newDate = new Date(selectedDate)
        if (type === 'hours') newDate.setHours(numValue)
        if (type === 'minutes') newDate.setMinutes(numValue)
        if (type === 'seconds') newDate.setSeconds(numValue)

        setSelectedDate(newDate)

        // format and update
        const year = newDate.getFullYear()
        const month = String(newDate.getMonth() + 1).padStart(2, '0')
        const day = String(newDate.getDate()).padStart(2, '0')
        const h = type === 'hours' ? paddedValue : hours
        const m = type === 'minutes' ? paddedValue : minutes
        const s = type === 'seconds' ? paddedValue : seconds
        const formattedDate = `${year}-${month}-${day} ${h}:${m}:${s}`

        setInputValue(formattedDate)
        onChange(formattedDate)
      }
    },
    [selectedDate, hours, minutes, seconds, onChange]
  )

  // handle "now" button
  const handleSetNow = useCallback(() => {
    const now = new Date()
    setSelectedDate(now)
    setHours(String(now.getHours()).padStart(2, '0'))
    setMinutes(String(now.getMinutes()).padStart(2, '0'))
    setSeconds(String(now.getSeconds()).padStart(2, '0'))

    // format as YYYY-MM-DD HH:mm:ss
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    const s = String(now.getSeconds()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day} ${h}:${m}:${s}`

    setInputValue(formattedDate)
    onChange(formattedDate)
    setOpen(false)
  }, [onChange])

  // determine display value
  const displayValue = isLive && !inputValue ? 'now' : inputValue

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative max-w-full">
        <PopoverTrigger asChild>
          <Input
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
              }
            }}
            className={cn(
              'pr-20 h-10',
              'border-border-subtle',
              'placeholder:prose-label placeholder:leading-[0%]',
              isValidDate && inputValue && 'border-accent-success-highlight',
              !isValidDate &&
                inputValue &&
                inputValue.trim() &&
                'border-accent-error-highlight',
              className
            )}
          />
        </PopoverTrigger>

        {/* icons and indicators */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && inputValue.trim() ? (
            isValidDate ? (
              <>
                <CopyButton
                  value={isoTimestamp}
                  variant="ghost"
                  size="iconSm"
                  className="h-7 w-7 hover:bg-transparent"
                  title="Copy ISO UTC timestamp"
                  tabIndex={-1}
                />
              </>
            ) : (
              <XCircle className="animate-fade-slide-in size-4 text-accent-error-highlight" />
            )
          ) : showLiveIndicator && isLive ? (
            <LiveDot classNames={{ circle: 'size-3', dot: 'size-1.5' }} />
          ) : null}
          <CalendarIcon className="animate-fade-slide-in size-4 text-fg-tertiary" />
        </div>
      </div>

      <PopoverContent
        className="w-auto p-0 bg-bg-1 border-stroke"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="flex flex-col">
          {/* calendar section */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            minDate={calculatedMinDate}
            maxDate={calculatedMaxDate}
            autoFocus
          />

          <Separator orientation="vertical" />

          {/* time selection section */}
          <div className="border-t border-stroke p-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-fg-tertiary prose-label">
                Time
              </Label>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-fg-tertiary text-center">
                    H
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={hours}
                    onChange={(e) => handleTimeChange('hours', e.target.value)}
                    className="h-8 text-center prose-body bg-bg border-stroke"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-fg-tertiary text-center">
                    M
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) =>
                      handleTimeChange('minutes', e.target.value)
                    }
                    className="h-8 text-center prose-body bg-bg border-stroke"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-fg-tertiary text-center">
                    S
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) =>
                      handleTimeChange('seconds', e.target.value)
                    }
                    className="h-8 text-center prose-body bg-bg border-stroke"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

export default DateTimeInput
