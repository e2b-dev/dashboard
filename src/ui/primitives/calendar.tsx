'use client'

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import * as React from 'react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils/index'
import { Button, buttonVariants } from '@/ui/primitives/button'

// we need to properly type the Calendar props to work with react-day-picker's union types
// the DayPicker component has different prop requirements based on the mode
type DayPickerBaseProps = React.ComponentProps<typeof DayPicker>

export type CalendarProps = DayPickerBaseProps & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
  minDate?: Date
  maxDate?: Date
}

import { isSameDay, isWithinInterval } from 'date-fns'

function isDateInRange(date: Date, minDate?: Date, maxDate?: Date): boolean {
  // if no min/max date, show all
  if (!minDate && !maxDate) return true

  // if both min/max date, use isWithinInterval
  if (minDate && maxDate) {
    return isWithinInterval(date, { start: minDate, end: maxDate })
  }

  // if only min date, show all dates after min date
  if (minDate && date < minDate) return false
  if (maxDate && date > maxDate) return false

  return true
}

// helper function to check if date matches disabled criteria
// handles all Matcher types from react-day-picker
function isDateDisabledByProp(
  date: Date,
  disabledProp?: DayPickerBaseProps['disabled']
): boolean {
  if (disabledProp === undefined || disabledProp === null) return false

  // boolean - all dates disabled or enabled
  if (typeof disabledProp === 'boolean') {
    return disabledProp
  }

  // function predicate
  if (typeof disabledProp === 'function') {
    return disabledProp(date)
  }

  // single date
  if (disabledProp instanceof Date) {
    return isSameDay(date, disabledProp)
  }

  // array of dates
  if (Array.isArray(disabledProp)) {
    return disabledProp.some((d) => d instanceof Date && isSameDay(date, d))
  }

  // for other complex Matcher types (DateRange, DateBefore, etc.)
  // we let react-day-picker handle them natively
  return false
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  minDate,
  maxDate,
  disabled: disabledProp,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  // combine the min/max date constraints with any existing disabled logic
  const disabledDates = React.useCallback(
    (date: Date) => {
      // check external disabled logic first
      if (isDateDisabledByProp(date, disabledProp)) {
        return true
      }

      // check date range constraints
      return !isDateInRange(date, minDate, maxDate)
    },
    [disabledProp, minDate, maxDate]
  )

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3 w-full', '[--cell-size:2rem]', className)}
      captionLayout={captionLayout}
      disabled={disabledDates}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        formatWeekdayName: (date) =>
          date
            .toLocaleString('default', { weekday: 'short' })
            .toUpperCase()
            .slice(0, 3),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col gap-3', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-3', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 select-none p-0',
          'text-fg-tertiary hover:text-fg',
          'hover:bg-transparent',
          'aria-disabled:opacity-50',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 select-none p-0',
          'text-fg-tertiary hover:text-fg',
          'hover:bg-transparent',
          'aria-disabled:opacity-50',
          defaultClassNames.button_next
        ),
        month_caption: cn(
          'flex h-7 w-full items-center justify-center',
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          'flex h-7 w-full items-center justify-center gap-1.5',
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          'relative rounded-md',
          defaultClassNames.dropdown_root
        ),
        dropdown: cn('absolute inset-0 opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'select-none',
          'text-fg prose-body-highlight',
          captionLayout === 'label'
            ? 'uppercase'
            : 'flex h-8 items-center gap-1 rounded-md pl-2 pr-1 [&>svg]:size-3.5',
          defaultClassNames.caption_label
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex gap-1', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 select-none text-center',
          'text-fg-tertiary prose-label uppercase',
          defaultClassNames.weekday
        ),
        week: cn('flex gap-1 mt-1', defaultClassNames.week),
        week_number_header: cn(
          'w-[--cell-size] select-none',
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          'select-none text-fg-tertiary prose-label',
          defaultClassNames.week_number
        ),
        day: cn(
          'group/day relative h-full w-full select-none p-0 text-center aspect-square',
          defaultClassNames.day
        ),
        range_start: cn('rounded-l-md', defaultClassNames.range_start),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md', defaultClassNames.range_end),
        today: cn('prose-label-highlight', defaultClassNames.today),
        outside: cn(
          'text-fg-tertiary/50',
          'aria-selected:text-fg-tertiary/50',
          defaultClassNames.outside
        ),
        disabled: cn('text-fg-tertiary', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, ...props }) => {
          return (
            <div data-slot="calendar" className={cn(className)} {...props} />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            )
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-today={modifiers.today}
      data-outside={modifiers.outside}
      className={cn(
        // base styles
        'p-auto',
        'text-fg prose-body',
        'hover:bg-bg-highlight transition-colors',
        'focus-visible:ring-1 focus-visible:ring-accent-main-highlight focus-visible:ring-offset-0',

        // range states
        'data-[range-middle=true]:bg-accent-main-bg',
        'data-[range-middle=true]:text-fg',
        'data-[range-middle=true]:rounded-none',

        'data-[range-start=true]:bg-accent-main-highlight',
        'data-[range-start=true]:text-fg-inverted',
        'data-[range-start=true]:rounded-l-md',
        'data-[range-start=true]:rounded-r-none',

        'data-[range-end=true]:bg-accent-main-highlight',
        'data-[range-end=true]:text-fg-inverted',
        'data-[range-end=true]:rounded-r-md',
        'data-[range-end=true]:rounded-l-none',

        // today indicator
        'data-[selected-single=true]:relative',
        'data-[selected-single=true]:after:absolute',
        'data-[selected-single=true]:after:-bottom-1.25',
        'data-[selected-single=true]:after:left-1/2',
        'data-[selected-single=true]:after:-translate-x-1/2',
        'data-[selected-single=true]:after:h-1.25',
        'data-[selected-single=true]:after:w-1.25',
        'data-[selected-single=true]:after:bg-accent-main-highlight',

        // outside month dates
        'data-[outside=true]:text-fg-tertiary/50',

        // disabled state
        'disabled:text-fg-tertiary/30',
        'disabled:cursor-not-allowed',
        'disabled:hover:bg-transparent',

        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
