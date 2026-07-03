'use client'

import { addMonths } from 'date-fns'
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import {
  formatTimeWithSpaces,
  parseDateTimeComponents,
  tryParseDatetime,
} from '@/lib/utils/formatting'
import { findMatchingPreset } from '@/lib/utils/time-range'
import { NumberInput } from '@/ui/number-input'
import { Button } from '@/ui/primitives/button'
import { Calendar, CalendarDayButton } from '@/ui/primitives/calendar'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  TimeIcon,
  UnpackIcon,
} from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group'
import { Separator } from '@/ui/primitives/separator'
import { getTimezoneIdentifier } from '@/ui/time-input'
import { parsePickerDateTime } from '@/ui/time-range-picker.logic'
import type { TimeRangePreset } from '@/ui/time-range-presets'

// reference date for parsing time-only values - actual date doesn't matter
const REFERENCE_DATE = '2024-01-01'
const ONE_DAY_MS = 1000 * 60 * 60 * 24

const USAGE_TIME_RANGE_BOUNDS = {
  min: new Date('2023-01-01'),
}

const MONTH_NAME_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'long' })
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

function endOfDay(date: Date): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

function startOfWeek(date: Date): Date {
  const start = startOfDay(date)
  start.setDate(start.getDate() - start.getDay())
  return start
}

function endOfWeek(date: Date): Date {
  const end = startOfWeek(date)
  end.setDate(end.getDate() + 6)
  return endOfDay(end)
}

function formatDateForPicker(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

// ---------------------------------------------------------------------------
// Time period presets
// ---------------------------------------------------------------------------

function getTodayRange() {
  const now = new Date()
  return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() }
}

function getYesterdayRange() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return {
    start: startOfDay(yesterday).getTime(),
    end: endOfDay(yesterday).getTime(),
  }
}

function getThisWeekRange() {
  const now = new Date()
  return { start: startOfWeek(now).getTime(), end: endOfWeek(now).getTime() }
}

function getLastWeekRange() {
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)
  return {
    start: startOfWeek(lastWeek).getTime(),
    end: endOfWeek(lastWeek).getTime(),
  }
}

function getThisMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )
  return { start: start.getTime(), end: end.getTime() }
}

function getLastMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  return { start: start.getTime(), end: end.getTime() }
}

const PRESETS: TimeRangePreset[] = [
  { id: 'today', label: 'Today', getValue: getTodayRange },
  { id: 'yesterday', label: 'Yesterday', getValue: getYesterdayRange },
  { id: 'this-week', label: 'This week', getValue: getThisWeekRange },
  { id: 'last-week', label: 'Last week', getValue: getLastWeekRange },
  { id: 'this-month', label: 'This month', getValue: getThisMonthRange },
  { id: 'last-month', label: 'Last month', getValue: getLastMonthRange },
]

// trigger button label for an active preset, e.g. "Today (3 July)",
// "This month (July)" - falls back to the plain label for week presets
function formatPresetTriggerLabel(preset: TimeRangePreset): string {
  const { start } = preset.getValue()

  switch (preset.id) {
    case 'today':
    case 'yesterday':
      return `${preset.label} (${new Date(start).getDate()} ${MONTH_NAME_FORMAT.format(start)})`
    case 'this-month':
    case 'last-month':
      return `${preset.label} (${MONTH_NAME_FORMAT.format(start)})`
    default:
      return preset.label
  }
}

// ---------------------------------------------------------------------------
// Calendar range-bar rendering
// ---------------------------------------------------------------------------

// Bridges the 8px gap between day cells so a selected range reads as one
// continuous bar instead of a row of separately-rounded boxes - only between
// cells that actually sit next to each other, never at a row's first/last
// column, where there's no neighboring selected cell to blend into.
//
// Tailwind needs each possible box-shadow value to appear as a static string
// literal to generate its CSS, so every branch below returns a full literal
// instead of assembling one from parts at runtime.
function getRangeShadowClassName(
  modifiers: ComponentProps<typeof CalendarDayButton>['modifiers'],
  isFirstColumn: boolean,
  isLastColumn: boolean
): string | false {
  if (modifiers.range_middle) {
    if (!isFirstColumn && !isLastColumn) {
      return '[box-shadow:-4px_0_0_var(--color-fill-highlight),4px_0_0_var(--color-fill-highlight)]'
    }
    if (!isFirstColumn) {
      return '[box-shadow:-4px_0_0_var(--color-fill-highlight)]'
    }
    if (!isLastColumn) {
      return '[box-shadow:4px_0_0_var(--color-fill-highlight)]'
    }
    return false
  }

  if (modifiers.range_start && !modifiers.range_end && !isLastColumn) {
    return '[box-shadow:4px_0_0_var(--color-accent-main-highlight)]'
  }
  if (modifiers.range_end && !modifiers.range_start && !isFirstColumn) {
    return '[box-shadow:-4px_0_0_var(--color-accent-main-highlight)]'
  }
  return false
}

function RangeDayButton(props: ComponentProps<typeof CalendarDayButton>) {
  const { modifiers, className, day, ...rest } = props
  const isFirstColumn = day.date.getDay() === 0
  const isLastColumn = day.date.getDay() === 6

  return (
    <CalendarDayButton
      day={day}
      modifiers={modifiers}
      className={cn(
        className,
        modifiers.range_middle && 'data-[range-middle=true]:!bg-fill-highlight',
        modifiers.range_start && 'data-[range-start=true]:!rounded-l-none',
        modifiers.range_end && 'data-[range-end=true]:!rounded-r-none',
        getRangeShadowClassName(modifiers, isFirstColumn, isLastColumn),
        // small marker under the last day of the selected range
        modifiers.range_end &&
          cn(
            'relative',
            'after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2',
            'after:h-[2.5px] after:w-[5px] after:bg-accent-main-highlight'
          )
      )}
      {...rest}
    />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface UsageDateRangePickerProps {
  timeframe: {
    start: number
    end: number
  }
  onTimeRangeChange: (start: number, end: number) => void
  className?: string
}

export function UsageDateRangePicker({
  timeframe,
  onTimeRangeChange,
  className,
}: UsageDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [manualSelection, setManualSelection] = useState<string | null>(null)
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>()
  const [pendingStartTime, setPendingStartTime] = useState('00:00:00')
  const [pendingEndTime, setPendingEndTime] = useState('23:59:59')
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  // seed the popover's working state from the committed timeframe every time
  // it opens, so it always starts from what's currently applied
  useEffect(() => {
    if (!open) return

    const start = new Date(timeframe.start)
    setPendingRange({ from: start, to: new Date(timeframe.end) })
    setPendingStartTime(
      parseDateTimeComponents(start.toISOString()).time || '00:00:00'
    )
    setPendingEndTime(
      parseDateTimeComponents(new Date(timeframe.end).toISOString()).time ||
        '23:59:59'
    )
    setManualSelection(null)
    setCalendarMonth(start)
  }, [open, timeframe.start, timeframe.end])

  const derivedPresetId = useMemo(
    () =>
      findMatchingPreset(PRESETS, timeframe.start, timeframe.end, ONE_DAY_MS),
    [timeframe.start, timeframe.end]
  )
  const selectedId = manualSelection ?? derivedPresetId ?? 'custom'

  const rangeLabel = useMemo(() => {
    const matchedPreset = PRESETS.find(
      (preset) => preset.id === derivedPresetId
    )
    if (matchedPreset) {
      return formatPresetTriggerLabel(matchedPreset)
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    return `${formatter.format(timeframe.start)} - ${formatter.format(timeframe.end)}`
  }, [derivedPresetId, timeframe.start, timeframe.end])

  const handlePresetSelect = useCallback(
    (preset: TimeRangePreset) => {
      const { start, end } = preset.getValue()
      onTimeRangeChange(start, end)
      setOpen(false)
    },
    [onTimeRangeChange]
  )

  const handlePeriodChange = useCallback(
    (value: string) => {
      if (value === 'custom') {
        setManualSelection('custom')
        return
      }
      const preset = PRESETS.find((p) => p.id === value)
      if (preset) {
        handlePresetSelect(preset)
      }
    },
    [handlePresetSelect]
  )

  const handleCalendarSelect = useCallback((range: DateRange | undefined) => {
    setPendingRange(range)
    setManualSelection('custom')
  }, [])

  const handlePrevMonth = useCallback(() => {
    setCalendarMonth((month) => addMonths(month, -1))
  }, [])

  const handleNextMonth = useCallback(() => {
    setCalendarMonth((month) => addMonths(month, 1))
  }, [])

  const handleApply = useCallback(() => {
    if (!pendingRange?.from || !pendingRange?.to) return

    const start = parsePickerDateTime(
      formatDateForPicker(pendingRange.from),
      pendingStartTime,
      '00:00:00'
    )
    const end = parsePickerDateTime(
      formatDateForPicker(pendingRange.to),
      pendingEndTime,
      '23:59:59'
    )
    if (!start || !end) return

    onTimeRangeChange(start.getTime(), end.getTime())
    setOpen(false)
  }, [pendingRange, pendingStartTime, pendingEndTime, onTimeRangeChange])

  const canApply = Boolean(pendingRange?.from && pendingRange?.to)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className={cn('gap-1.5', className)}>
          <HistoryIcon className="size-4" />
          {rangeLabel}
          <UnpackIcon className={cn(open && 'text-fg')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-md:w-[calc(100vw-2rem)]"
        side="bottom"
        align="start"
        sideOffset={4}
      >
        <div className="flex max-md:flex-col">
          <PeriodPresetList
            selectedId={selectedId}
            onChange={handlePeriodChange}
          />
          <Separator orientation="vertical" className="h-auto max-md:hidden" />
          <Separator orientation="horizontal" className="w-auto md:hidden" />
          <RangeCalendar
            calendarMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            pendingRange={pendingRange}
            onSelect={handleCalendarSelect}
          />
          <Separator orientation="vertical" className="h-auto max-md:hidden" />
          <Separator orientation="horizontal" className="w-auto md:hidden" />
          <TimeRangeFields
            startValue={pendingStartTime}
            endValue={pendingEndTime}
            onStartChange={setPendingStartTime}
            onEndChange={setPendingEndTime}
            onApply={handleApply}
            applyDisabled={!canApply}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Popover sections
// ---------------------------------------------------------------------------

function PeriodPresetList({
  selectedId,
  onChange,
}: {
  selectedId: string
  onChange: (value: string) => void
}) {
  const presetLabelClassName = cn(
    'flex cursor-pointer select-none items-center gap-2',
    'px-2 py-1.5',
    'hover:bg-bg-highlight transition-colors'
  )

  return (
    <div className="flex w-44 flex-col gap-2 px-4 py-3 max-md:w-full">
      <span className="prose-label text-fg-tertiary uppercase">
        Time period
      </span>
      <RadioGroup value={selectedId} onValueChange={onChange} className="gap-0">
        {PRESETS.map((preset) => (
          <label
            key={preset.id}
            htmlFor={preset.id}
            className={presetLabelClassName}
          >
            <RadioGroupItem value={preset.id} id={preset.id} />
            <span>{preset.label}</span>
          </label>
        ))}
        <label htmlFor="custom" className={presetLabelClassName}>
          <RadioGroupItem value="custom" id="custom" />
          <span>Custom</span>
        </label>
      </RadioGroup>
    </div>
  )
}

function RangeCalendar({
  calendarMonth,
  onMonthChange,
  onPrevMonth,
  onNextMonth,
  pendingRange,
  onSelect,
}: {
  calendarMonth: Date
  onMonthChange: (month: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  pendingRange: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <IconButton onClick={onPrevMonth}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="flex items-center gap-2">
          <span className="text-fg">
            {MONTH_YEAR_FORMAT.format(calendarMonth)}
          </span>
          <div className="h-px w-4 bg-fg-tertiary" />
          <span className="text-fg">
            {MONTH_YEAR_FORMAT.format(addMonths(calendarMonth, 1))}
          </span>
        </div>
        <IconButton onClick={onNextMonth}>
          <ChevronRightIcon />
        </IconButton>
      </div>
      <Calendar
        mode="range"
        numberOfMonths={2}
        month={calendarMonth}
        onMonthChange={onMonthChange}
        selected={pendingRange}
        onSelect={onSelect}
        minDate={USAGE_TIME_RANGE_BOUNDS.min}
        showOutsideDays={false}
        className="p-0"
        classNames={{
          months: 'relative flex flex-row gap-8',
          // 258px = 7 days * 30px + 6 gaps * 8px - must stay a literal so
          // Tailwind's compiler can see and generate it
          month: 'flex w-[258px] flex-col gap-3',
          nav: 'hidden',
          month_caption: 'hidden',
          weekdays: 'flex gap-2',
          week: 'flex gap-2 mt-2',
        }}
        components={{ DayButton: RangeDayButton }}
      />
    </div>
  )
}

function TimeRangeFields({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onApply,
  applyDisabled,
}: {
  startValue: string
  endValue: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onApply: () => void
  applyDisabled: boolean
}) {
  return (
    <div className="flex w-48 flex-col gap-3 p-3 max-md:w-full">
      <TimeOfDayField
        label="Start time"
        value={startValue}
        onChange={onStartChange}
      />
      <TimeOfDayField
        label="End time"
        value={endValue}
        onChange={onEndChange}
      />
      <Button
        variant="secondary"
        className="mt-auto w-full"
        disabled={applyDisabled}
        onClick={onApply}
      >
        Apply
      </Button>
    </div>
  )
}

function TimeOfDayField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [displayValue, setDisplayValue] = useState(value)

  const timeDate = tryParseDatetime(`${REFERENCE_DATE} ${value}`)
  const [hours, setHours] = useState(timeDate ? timeDate.getHours() : 0)
  const [minutes, setMinutes] = useState(timeDate ? timeDate.getMinutes() : 0)
  const [seconds, setSeconds] = useState(timeDate ? timeDate.getSeconds() : 0)

  useEffect(() => {
    setDisplayValue(value)
    const parsed = tryParseDatetime(`${REFERENCE_DATE} ${value}`)
    if (parsed) {
      setHours(parsed.getHours())
      setMinutes(parsed.getMinutes())
      setSeconds(parsed.getSeconds())
    }
  }, [value])

  const commit = useCallback(
    (nextHours: number, nextMinutes: number, nextSeconds: number) => {
      const formatted = `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}:${String(nextSeconds).padStart(2, '0')}`
      setDisplayValue(formatTimeWithSpaces(nextHours, nextMinutes, nextSeconds))
      onChange(formatted)
    },
    [onChange]
  )

  return (
    <div className="flex flex-col gap-1">
      <span className="prose-label text-fg-tertiary uppercase">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <Input
            type="text"
            value={displayValue}
            onChange={(e) => setDisplayValue(e.target.value)}
            onBlur={() => onChange(displayValue)}
            placeholder="HH:MM:SS"
            className="pr-16 bg-transparent"
          />
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <span className="prose-label text-fg-tertiary font-mono">
              {getTimezoneIdentifier()}
            </span>
            <PopoverTrigger asChild>
              <IconButton tabIndex={-1}>
                <TimeIcon />
              </IconButton>
            </PopoverTrigger>
          </div>
        </div>
        <PopoverContent
          className="w-auto p-3"
          side="bottom"
          align="start"
          sideOffset={4}
        >
          <div className="flex items-center justify-center gap-2">
            <TimeUnitSpinner
              label="Hours"
              value={hours}
              max={23}
              onChange={(value) => {
                setHours(value)
                commit(value, minutes, seconds)
              }}
              borderClassName="border-r-0"
            />
            <TimeUnitSpinner
              label="Minutes"
              value={minutes}
              max={59}
              onChange={(value) => {
                setMinutes(value)
                commit(hours, value, seconds)
              }}
              borderClassName="border-r-0"
            />
            <TimeUnitSpinner
              label="Seconds"
              value={seconds}
              max={59}
              onChange={(value) => {
                setSeconds(value)
                commit(hours, minutes, value)
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function TimeUnitSpinner({
  label,
  value,
  max,
  onChange,
  borderClassName,
}: {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
  borderClassName?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="prose-label text-fg-tertiary">{label}</span>
      <NumberInput
        value={value}
        onChange={onChange}
        min={0}
        max={max}
        step={1}
        inputClassName={cn('h-8 w-11 text-center', borderClassName)}
        buttonClassName="h-[1rem]"
      />
    </div>
  )
}
