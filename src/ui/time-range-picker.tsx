/**
 * General-purpose time range selection component
 * A simplified abstraction for picking start and end date/time ranges
 */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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

  // Create dynamic zod schema based on min/max dates
  const schema = useMemo(() => {
    // When hideTime is true, allow dates up to end of today
    // Otherwise, allow up to now + 10 seconds (for time drift)
    const defaultMaxDate = hideTime
      ? (() => {
          const endOfToday = new Date()
          endOfToday.setDate(endOfToday.getDate() + 1)
          endOfToday.setHours(0, 0, 0, 0)
          return endOfToday
        })()
      : new Date(Date.now() + 10000)

    const maxDateValue = maxDate || defaultMaxDate
    const minDateValue = minDate

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
            message: `Start date cannot be before ${minDateValue.toLocaleDateString()}`,
            path: ['startDate'],
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
  }, [minDate, maxDate, hideTime])

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
                  minDate={minDate}
                  maxDate={maxDate}
                  onDateChange={(value) => {
                    dateField.onChange(value)
                    form.trigger(['startDate', 'endDate'])
                  }}
                  onTimeChange={(value) => {
                    form.setValue('startTime', value || null, {
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
                  minDate={minDate}
                  maxDate={maxDate}
                  onDateChange={(value) => {
                    dateField.onChange(value)
                    form.trigger(['startDate', 'endDate'])
                  }}
                  onTimeChange={(value) => {
                    form.setValue('endTime', value || null, {
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
          variant="secondary"
        >
          Apply
        </Button>
      </form>
    </Form>
  )
}
