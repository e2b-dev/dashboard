'use client'

import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subHours,
  subMinutes,
  subMonths,
  subWeeks,
} from 'date-fns'
import { ReactNode, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils/formatting'
import type { TimeframeState } from '@/lib/utils/timeframe'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './primitives/dropdown-menu'
import { RadioGroup, RadioGroupItem } from './primitives/radio-group'

interface TimeOption {
  label: string
  value: string
  shortcut: string
  rangeMs: number
}

// generate time option labels using formatDuration
const timeOptions: TimeOption[] = [
  {
    label: `Last ${formatDuration(60 * 1000)}`,
    value: '1m',
    shortcut: '1M',
    rangeMs: 60 * 1000,
  },
  {
    label: `Last ${formatDuration(5 * 60 * 1000)}`,
    value: '5m',
    shortcut: '5M',
    rangeMs: 5 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(10 * 60 * 1000)}`,
    value: '10m',
    shortcut: '10M',
    rangeMs: 10 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(15 * 60 * 1000)}`,
    value: '15m',
    shortcut: '15M',
    rangeMs: 15 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(30 * 60 * 1000)}`,
    value: '30m',
    shortcut: '30M',
    rangeMs: 30 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(60 * 60 * 1000)}`,
    value: '1h',
    shortcut: '1H',
    rangeMs: 60 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(3 * 60 * 60 * 1000)}`,
    value: '3h',
    shortcut: '3H',
    rangeMs: 3 * 60 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(6 * 60 * 60 * 1000)}`,
    value: '6h',
    shortcut: '6H',
    rangeMs: 6 * 60 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(12 * 60 * 60 * 1000)}`,
    value: '12h',
    shortcut: '12h',
    rangeMs: 12 * 60 * 60 * 1000,
  },
  {
    label: `Last ${formatDuration(24 * 60 * 60 * 1000)}`,
    value: '24h',
    shortcut: '24H',
    rangeMs: 24 * 60 * 60 * 1000,
  },
  {
    label: `Last 7 days`,
    value: '7d',
    shortcut: '7d',
    rangeMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    label: `Last 14 days`,
    value: '14d',
    shortcut: '14D',
    rangeMs: 14 * 24 * 60 * 60 * 1000,
  },
  {
    label: `Last 30 days`,
    value: '30d',
    shortcut: '30D',
    rangeMs: 30 * 24 * 60 * 60 * 1000,
  },
]

interface TimePickerProps {
  value?: TimeframeState
  onValueChange?: (value: TimeframeState) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  children: ReactNode
}

export function TimePicker({
  value = { mode: 'live', range: 60 * 60 * 1000 }, // default 1 hour
  onValueChange,
  placeholder = 'Select period',
  className,
  disabled = false,
  children,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [selectedValue, setSelectedValue] = useState(() => {
    // track current selection by value key
    if (value.mode === 'live' && value.range) {
      const option = timeOptions.find((opt) => opt.rangeMs === value.range)
      return option?.value || 'custom'
    }
    return 'custom'
  })

  // update selected value when prop changes
  useEffect(() => {
    if (value.mode === 'live' && value.range) {
      const option = timeOptions.find((opt) => opt.rangeMs === value.range)
      if (option) {
        setSelectedValue(option.value)
      }
    }
  }, [value])

  const handleOptionSelect = (newValue: string) => {
    setSelectedValue(newValue)

    // find the option and create TimeframeState
    const option = timeOptions.find((opt) => opt.value === newValue)
    if (option) {
      onValueChange?.({
        mode: 'live',
        range: option.rangeMs,
      })
    }
  }

  // handle custom date input
  const handleCustomInputSubmit = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter' && customInput) {
      // try to parse as date range
      if (customInput.includes(' to ') || customInput.includes(' - ')) {
        const separator = customInput.includes(' to ') ? ' to ' : ' - '
        const parts = customInput.split(separator)
        if (parts.length === 2 && parts[0] && parts[1]) {
          // try humanized parsing for each part
          const startHumanized = parseHumanizedDate(parts[0].trim())
          const endHumanized = parseHumanizedDate(parts[1].trim())

          const startDate = startHumanized
            ? new Date(startHumanized.start)
            : new Date(parts[0].trim())
          const endDate = endHumanized
            ? new Date(endHumanized.end)
            : new Date(parts[1].trim())

          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            onValueChange?.({
              mode: 'static',
              start: startDate.getTime(),
              end: endDate.getTime(),
            })
            setCustomInput('')
            setSelectedValue('custom')
            setOpen(false)
            return
          }
        }
      }

      // try to parse as humanized date
      const humanized = parseHumanizedDate(customInput)
      if (humanized) {
        onValueChange?.({
          mode: 'static',
          start: humanized.start,
          end: humanized.end,
        })
        setCustomInput('')
        setSelectedValue('custom')
        setOpen(false)
        return
      }

      // try to parse as single date
      const parsedDate = new Date(customInput)
      if (!isNaN(parsedDate.getTime())) {
        const timestamp = parsedDate.getTime()
        const now = Date.now()
        const start = timestamp < now ? timestamp : now
        const end = timestamp < now ? now : timestamp

        onValueChange?.({
          mode: 'static',
          start,
          end,
        })
        setCustomInput('')
        setSelectedValue('custom')
        setOpen(false)
      }
    }
  }

  // parse humanized date strings
  const parseHumanizedDate = (
    input: string
  ): { start: number; end: number } | null => {
    const now = new Date()
    const lowercased = input.toLowerCase().trim()

    // relative past dates
    if (lowercased === 'today') {
      return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() }
    }
    if (lowercased === 'yesterday') {
      const yesterday = subDays(now, 1)
      return {
        start: startOfDay(yesterday).getTime(),
        end: endOfDay(yesterday).getTime(),
      }
    }
    if (lowercased === 'this week') {
      return { start: startOfWeek(now).getTime(), end: now.getTime() }
    }
    if (lowercased === 'last week') {
      const lastWeek = subWeeks(now, 1)
      return {
        start: startOfWeek(lastWeek).getTime(),
        end: endOfWeek(lastWeek).getTime(),
      }
    }
    if (lowercased === 'this month') {
      return { start: startOfMonth(now).getTime(), end: now.getTime() }
    }
    if (lowercased === 'last month') {
      const lastMonth = subMonths(now, 1)
      return {
        start: startOfMonth(lastMonth).getTime(),
        end: endOfMonth(lastMonth).getTime(),
      }
    }

    // relative time patterns (e.g., "2 hours ago", "last 3 days")
    const agoPattern = /(\d+)\s*(second|minute|hour|day|week|month)s?\s*ago/i
    const lastPattern = /last\s+(\d+)\s*(second|minute|hour|day|week|month)s?/i

    const match = lowercased.match(agoPattern) || lowercased.match(lastPattern)
    if (match && match[1] && match[2]) {
      const amount = match[1]
      const unit = match[2]
      const value = parseInt(amount)
      let start = now

      switch (unit.toLowerCase()) {
        case 'second':
          start = subMinutes(now, Math.floor(value / 60))
          break
        case 'minute':
          start = subMinutes(now, value)
          break
        case 'hour':
          start = subHours(now, value)
          break
        case 'day':
          start = subDays(now, value)
          break
        case 'week':
          start = subWeeks(now, value)
          break
        case 'month':
          start = subMonths(now, value)
          break
      }

      return { start: start.getTime(), end: now.getTime() }
    }

    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px] p-2">
        {/* time options with radio buttons */}
        <RadioGroup
          value={selectedValue}
          onValueChange={handleOptionSelect}
          className="gap-0"
        >
          {timeOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 cursor-pointer',
                'hover:bg-bg-highlight'
              )}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value={option.value} />
                <span className="prose-body">{option.label}</span>
              </div>
              <span className="font-mono uppercase prose-label text-fg-tertiary">
                {option.shortcut}
              </span>
            </label>
          ))}
        </RadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default TimePicker
