'use client'

import { format, isFuture } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import * as React from 'react'
import { DateRange, SelectRangeEventHandler } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import { Calendar } from '@/ui/primitives/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'

interface DatePickerWithRangeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange
  onDateChange: SelectRangeEventHandler
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-fg-500'
            )}
          >
            <CalendarIcon />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={1}
            showOutsideDays={false}
            disabled={(date) => isFuture(date)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
