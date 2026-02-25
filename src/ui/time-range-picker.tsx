/**
 * General-purpose time range selection component
 * A simplified abstraction for picking start and end date/time ranges
 */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { endOfDay, startOfDay } from 'date-fns'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import {
  parseDateTimeComponents,
  tryParseDatetime,
} from '@/lib/utils/formatting'

import { Button } from './primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './primitives/form'
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

function toSecondPrecision(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000)
}

function clampDateTimeToBounds(
  date: string,
  time: string | null,
  options: {
    fallbackTime: string
    minDate?: Date
    maxDate?: Date
  }
): { date: string; time: string | null } {
  const timestamp = tryParseDatetime(
    `${date} ${time || options.fallbackTime}`
  )?.getTime()

  if (!timestamp) {
    return { date, time }
  }

  const minTimestamp = options.minDate?.getTime()
  const maxTimestamp = options.maxDate?.getTime()
  let clampedTimestamp = timestamp

  if (minTimestamp !== undefined && clampedTimestamp < minTimestamp) {
    clampedTimestamp = minTimestamp
  }

  if (maxTimestamp !== undefined && clampedTimestamp > maxTimestamp) {
    clampedTimestamp = maxTimestamp
  }

  if (clampedTimestamp === timestamp) {
    return { date, time }
  }

  const next = parseDateTimeComponents(new Date(clampedTimestamp).toISOString())
  return {
    date: next.date,
    time: next.time || null,
  }
}

function formatBoundaryDateTime(date: Date, hideTime: boolean): string {
  if (hideTime) {
    return date.toLocaleDateString()
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
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
  const calendarMinDate = useMemo(
    () => (minDate ? startOfDay(minDate) : undefined),
    [minDate]
  )
  const calendarMaxDate = useMemo(
    () => (maxDate ? endOfDay(maxDate) : undefined),
    [maxDate]
  )
  const minDateValue = useMemo(
    () => (minDate ? toSecondPrecision(minDate) : undefined),
    [minDate]
  )
  const maxDateValue = useMemo(
    () => (maxDate ? toSecondPrecision(maxDate) : undefined),
    [maxDate]
  )

  // Create dynamic zod schema based on min/max dates
  const schema = useMemo(() => {
    return z
      .object({
        startDate: z.string().min(1, 'Start date is required'),
        startTime: z.string().nullable(),
        endDate: z.string().min(1, 'End date is required'),
        endTime: z.string().nullable(),
      })
      .superRefine((data, ctx) => {
        const startTimeStr = data.startTime || '00:00:00'
        const endTimeStr = data.endTime || '23:59:59'
        const startTimestamp = tryParseDatetime(
          `${data.startDate} ${startTimeStr}`
        )?.getTime()
        const endTimestamp = tryParseDatetime(
          `${data.endDate} ${endTimeStr}`
        )?.getTime()

        if (!startTimestamp) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid start date format',
            path: ['startDate'],
          })
          return
        }

        if (!endTimestamp) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid end date format',
            path: ['endDate'],
          })
          return
        }

        // validate against min date
        if (minDateValue && startTimestamp < minDateValue.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Start date cannot be before ${formatBoundaryDateTime(minDateValue, hideTime)}`,
            path: ['startDate'],
          })
        }

        if (maxDateValue && endTimestamp > maxDateValue.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `End date cannot be after ${formatBoundaryDateTime(maxDateValue, hideTime)}`,
            path: ['endDate'],
          })
        }

        // validate end date is not before start date
        if (endTimestamp < startTimestamp) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'End date cannot be before start date',
            path: ['endDate'],
          })
        }
      })
  }, [hideTime, maxDateValue, minDateValue])

  const clampStartDateTime = useCallback(
    (date: string, time: string | null) =>
      clampDateTimeToBounds(date, time, {
        fallbackTime: '00:00:00',
        minDate: minDateValue,
      }),
    [minDateValue]
  )

  const clampEndDateTime = useCallback(
    (date: string, time: string | null) =>
      clampDateTimeToBounds(date, time, {
        fallbackTime: '23:59:59',
        maxDate: maxDateValue,
      }),
    [maxDateValue]
  )

  const form = useForm<TimeRangeValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: startParts.date || '',
      startTime: startParts.time || null,
      endDate: endParts.date || '',
      endTime: endParts.time || null,
    },
    mode: 'onChange',
  })

  // sync with external props when they change
  useEffect(() => {
    const currentStartTime = form.getValues('startDate')
      ? tryParseDatetime(
          `${form.getValues('startDate')} ${form.getValues('startTime')}`
        )?.getTime()
      : undefined
    const currentEndTime = form.getValues('endDate')
      ? tryParseDatetime(
          `${form.getValues('endDate')} ${form.getValues('endTime')}`
        )?.getTime()
      : undefined

    const propStartTime = startDateTime
      ? tryParseDatetime(startDateTime)?.getTime()
      : undefined
    const propEndTime = endDateTime
      ? tryParseDatetime(endDateTime)?.getTime()
      : undefined

    // detect meaningful external changes (>1s difference)
    const startChanged =
      propStartTime &&
      currentStartTime &&
      Math.abs(propStartTime - currentStartTime) > 1000
    const endChanged =
      propEndTime &&
      currentEndTime &&
      Math.abs(propEndTime - currentEndTime) > 1000

    const isExternalChange = startChanged || endChanged

    if (isExternalChange && !form.formState.isDirty) {
      const newStartParts = parseDateTimeComponents(startDateTime)
      const newEndParts = parseDateTimeComponents(endDateTime)

      form.reset({
        startDate: newStartParts.date || '',
        startTime: newStartParts.time || null,
        endDate: newEndParts.date || '',
        endTime: newEndParts.time || null,
      })
    }
  }, [startDateTime, endDateTime, form])

  // Notify on changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      onChange?.(values as TimeRangeValues)
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])

  const handleSubmit = useCallback(
    (values: TimeRangeValues) => {
      onApply?.(values)
    },
    [onApply]
  )

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn('flex flex-col gap-4 h-full', className)}
      >
        <FormField
          control={form.control}
          name="startDate"
          render={({ field: dateField }) => (
            <FormItem>
              <FormLabel className="prose-label uppercase text-fg-tertiary">
                Start Time
              </FormLabel>
              <FormControl>
                <TimeInput
                  dateValue={dateField.value}
                  timeValue={form.watch('startTime') || ''}
                  minDate={calendarMinDate}
                  maxDate={calendarMaxDate}
                  onDateChange={(value) => {
                    const currentTime = form.getValues('startTime') || null
                    const next = clampStartDateTime(value, currentTime)
                    dateField.onChange(next.date)
                    form.setValue('startTime', next.time, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                    form.trigger(['startDate', 'endDate'])
                  }}
                  onTimeChange={(value) => {
                    const currentDate = form.getValues('startDate')
                    const next = clampStartDateTime(currentDate, value || null)
                    form.setValue('startDate', next.date, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                    form.setValue('startTime', next.time, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                    form.trigger(['startDate', 'endDate'])
                  }}
                  disabled={false}
                  hideTime={hideTime}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endDate"
          render={({ field: dateField }) => (
            <FormItem>
              <FormLabel className="prose-label uppercase text-fg-tertiary">
                End Time
              </FormLabel>
              <FormControl>
                <TimeInput
                  dateValue={dateField.value}
                  timeValue={form.watch('endTime') || ''}
                  minDate={calendarMinDate}
                  maxDate={calendarMaxDate}
                  onDateChange={(value) => {
                    const currentTime = form.getValues('endTime') || null
                    const next = clampEndDateTime(value, currentTime)
                    dateField.onChange(next.date)
                    form.setValue('endTime', next.time, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                    form.trigger(['startDate', 'endDate'])
                  }}
                  onTimeChange={(value) => {
                    const currentDate = form.getValues('endDate')
                    const next = clampEndDateTime(currentDate, value || null)
                    form.setValue('endDate', next.date, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                    form.setValue('endTime', next.time, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                    form.trigger(['startDate', 'endDate'])
                  }}
                  disabled={false}
                  hideTime={hideTime}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={!form.formState.isDirty || !form.formState.isValid}
          className="w-fit self-end mt-auto"
          variant="outline"
        >
          Apply
        </Button>
      </form>
    </Form>
  )
}
