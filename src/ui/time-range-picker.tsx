'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
  formatDateTimeInput,
  useTimezone,
  instantToCalendarDate,
} from '@/features/dashboard/timezone'
import { cn } from '@/lib/utils'

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
import {
  createTimeRangeSchema,
  normalizeTimeRangeValues,
  parseTimeRangeValuesToTimestamps,
  type TimeRangePickerBounds,
  type TimeRangeValues,
} from './time-range-picker.logic'

export type { TimeRangeValues } from './time-range-picker.logic'

export interface TimeRangeApplyResult {
  values: TimeRangeValues
  start: number
  end: number
}

interface TimeRangePickerProps {
  startDateTime: string
  endDateTime: string
  bounds?: TimeRangePickerBounds
  onApply?: (result: TimeRangeApplyResult) => void
  onChange?: (values: TimeRangeValues) => void
  className?: string
  hideTime?: boolean
}

export function TimeRangePicker({
  startDateTime,
  endDateTime,
  bounds,
  onApply,
  onChange,
  className,
  hideTime = false,
}: TimeRangePickerProps) {
  'use no memo'

  const { timezone } = useTimezone()
  const minBoundMs = bounds?.min?.getTime()
  const maxBoundMs = bounds?.max?.getTime()

  const startParts = useMemo(
    () => formatDateTimeInput(startDateTime, timezone),
    [startDateTime, timezone]
  )
  const endParts = useMemo(
    () => formatDateTimeInput(endDateTime, timezone),
    [endDateTime, timezone]
  )

  const calendarMinDate = useMemo(
    () =>
      minBoundMs !== undefined
        ? instantToCalendarDate(minBoundMs, timezone)
        : undefined,
    [minBoundMs, timezone]
  )

  const calendarMaxDate = useMemo(
    () =>
      maxBoundMs !== undefined
        ? instantToCalendarDate(maxBoundMs, timezone)
        : undefined,
    [maxBoundMs, timezone]
  )

  const schema = useMemo(() => {
    return createTimeRangeSchema({
      hideTime,
      bounds: {
        min: minBoundMs !== undefined ? new Date(minBoundMs) : undefined,
        max: maxBoundMs !== undefined ? new Date(maxBoundMs) : undefined,
      },
      timezone,
    })
  }, [hideTime, maxBoundMs, minBoundMs, timezone])

  const defaultValues = useMemo(
    () => ({
      startDate: startParts.date || '',
      startTime: startParts.time || null,
      endDate: endParts.date || '',
      endTime: endParts.time || null,
    }),
    [endParts.date, endParts.time, startParts.date, startParts.time]
  )

  const form = useForm<TimeRangeValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    if (form.formState.isDirty) {
      return
    }

    const currentValues = form.getValues()
    if (
      currentValues.startDate === defaultValues.startDate &&
      currentValues.startTime === defaultValues.startTime &&
      currentValues.endDate === defaultValues.endDate &&
      currentValues.endTime === defaultValues.endTime
    ) {
      return
    }

    form.reset(defaultValues)
  }, [defaultValues, form, form.formState.isDirty])

  useEffect(() => {
    const subscription = form.watch((values) => {
      onChange?.(values as TimeRangeValues)
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])

  const handleSubmit = useCallback(
    (values: TimeRangeValues) => {
      const normalizedValues = normalizeTimeRangeValues(values)
      const timestamps = parseTimeRangeValuesToTimestamps(
        normalizedValues,
        timezone
      )
      if (timestamps) {
        onApply?.({ values: normalizedValues, ...timestamps })
      }
      form.reset(normalizedValues)
    },
    [form, onApply, timezone]
  )

  const shouldValidateOnChange = form.formState.submitCount > 0

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
                    form.setValue('startDate', value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: shouldValidateOnChange,
                    })
                  }}
                  onTimeChange={(value) => {
                    form.setValue('startTime', value || null, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: shouldValidateOnChange,
                    })
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
                    form.setValue('endDate', value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: shouldValidateOnChange,
                    })
                  }}
                  onTimeChange={(value) => {
                    form.setValue('endTime', value || null, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: shouldValidateOnChange,
                    })
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
          disabled={!form.formState.isDirty || form.formState.isSubmitting}
          className="w-fit self-end mt-auto"
          variant="secondary"
        >
          Apply
        </Button>
      </form>
    </Form>
  )
}
