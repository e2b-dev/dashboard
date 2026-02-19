/**
 * Custom time range selection panel component
 */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { UseFormReturn, useForm } from 'react-hook-form'

import {
  parseDateTimeComponents,
  tryParseDatetime,
} from '@/lib/utils/formatting'
import { Button } from '@/ui/primitives/button'
import { Checkbox } from '@/ui/primitives/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { TimeInput } from '@/ui/time-input'

import { MAX_DAYS_AGO } from './constants'
import { customTimeFormSchema, type CustomTimeFormValues } from './validation'

export interface TimePanelRef {
  form: UseFormReturn<CustomTimeFormValues>
  submit: () => void
  isDirty: boolean
}

interface TimePanelProps {
  startDateTime: string
  endDateTime: string
  endEnabled: boolean
  onSubmit: (values: CustomTimeFormValues) => void
  onValuesChange: (values: CustomTimeFormValues) => void
}

export const TimePanel = forwardRef<TimePanelRef, TimePanelProps>(
  function TimePanel(
    { startDateTime, endDateTime, endEnabled, onSubmit, onValuesChange },
    ref
  ) {
    'use no memo'

    const startParts = parseDateTimeComponents(startDateTime)
    const endParts = parseDateTimeComponents(endDateTime)

    const form = useForm<CustomTimeFormValues>({
      resolver: zodResolver(customTimeFormSchema),
      defaultValues: {
        startDate: startParts.date || '',
        startTime: startParts.time || '',
        endDate: endParts.date || '',
        endTime: endParts.time || '',
        endEnabled: endEnabled || false,
      },
      mode: 'onSubmit',
      reValidateMode: 'onSubmit',
    })

    // prevent external updates while user is actively editing
    const [isFocused, setIsFocused] = useState(false)
    const lastPropsRef = useRef({ startDateTime, endDateTime, endEnabled })

    const handleFormSubmit = useCallback(
      (values: CustomTimeFormValues) => {
        onSubmit(values)
        form.reset(values)
      },
      [onSubmit, form]
    )

    useImperativeHandle(
      ref,
      () => ({
        form,
        submit: () => form.handleSubmit(handleFormSubmit)(),
        isDirty: form.formState.isDirty,
      }),
      [form, handleFormSubmit]
    )

    // sync form with external props (but not when user is editing)
    useEffect(() => {
      if (form.formState.isDirty || isFocused) {
        return
      }

      const currentFormStart = form.getValues('startDate')
      const currentFormStartTime = currentFormStart
        ? tryParseDatetime(
            `${currentFormStart} ${form.getValues('startTime')}`
          )?.getTime()
        : undefined
      const propStartTime = startDateTime
        ? tryParseDatetime(startDateTime)?.getTime()
        : undefined

      // detect meaningful external changes (>1s difference)
      const isExternalChange =
        propStartTime &&
        currentFormStartTime &&
        Math.abs(propStartTime - currentFormStartTime) > 1000

      const isInitialOrModeChange =
        !lastPropsRef.current.startDateTime ||
        lastPropsRef.current.endEnabled !== endEnabled

      if (isExternalChange || isInitialOrModeChange) {
        const startParts = parseDateTimeComponents(startDateTime)
        const endParts = parseDateTimeComponents(endDateTime)

        form.reset({
          startDate: startParts.date || '',
          startTime: startParts.time || '',
          endDate: endParts.date || '',
          endTime: endParts.time || '',
          endEnabled: endEnabled || false,
        })
      }

      lastPropsRef.current = { startDateTime, endDateTime, endEnabled }
    }, [
      startDateTime,
      endDateTime,
      endEnabled,
      form,
      form.formState.isDirty,
      isFocused,
    ])

    useEffect(() => {
      const subscription = form.watch((values) => {
        onValuesChange(values as CustomTimeFormValues)
      })
      return () => subscription.unsubscribe()
    }, [form, onValuesChange])

    const { minDate, maxDate } = useMemo(() => {
      const now = new Date()

      // create new Date object for minDate (31 days ago)
      const minDate = new Date(now.getTime() - MAX_DAYS_AGO)
      minDate.setHours(0, 0, 0, 0)

      // create new Date object for maxDate (end of today)
      const maxDate = new Date(now)
      maxDate.setHours(23, 59, 59, 999)

      return { minDate, maxDate }
    }, [])

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="p-4 flex flex-col gap-4 h-full"
        >
          <div>
            <FormLabel className="prose-label uppercase text-fg-tertiary mb-2 block">
              Start Time
            </FormLabel>
            <div className="flex gap-2">
              <FormItem className="flex-1">
                <FormControl>
                  <div
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  >
                    <TimeInput
                      dateValue={form.watch('startDate')}
                      timeValue={form.watch('startTime')}
                      minDate={minDate}
                      maxDate={maxDate}
                      onDateChange={(value) =>
                        form.setValue('startDate', value, { shouldDirty: true })
                      }
                      onTimeChange={(value) =>
                        form.setValue('startTime', value, { shouldDirty: true })
                      }
                      disabled={false}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            </div>
          </div>

          <FormField
            control={form.control}
            name="endEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="prose-label uppercase text-fg-tertiary flex items-center gap-2">
                    End Time
                  </FormLabel>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>
                <div className={!field.value ? 'opacity-50' : ''}>
                  <div className="flex gap-2">
                    <FormItem className="flex-1">
                      <FormControl>
                        <div
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                        >
                          <TimeInput
                            dateValue={form.watch('endDate') || ''}
                            timeValue={form.watch('endTime') || ''}
                            minDate={minDate}
                            maxDate={maxDate}
                            onDateChange={(value) =>
                              form.setValue('endDate', value, {
                                shouldDirty: true,
                              })
                            }
                            onTimeChange={(value) =>
                              form.setValue('endTime', value, {
                                shouldDirty: true,
                              })
                            }
                            disabled={!field.value}
                            isLive={!field.value}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={!form.formState.isDirty}
            className="w-fit self-end mt-auto"
            variant="outline"
          >
            Apply
          </Button>
        </form>
      </Form>
    )
  }
)
