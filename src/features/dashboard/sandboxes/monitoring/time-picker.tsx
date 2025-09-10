'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import {
  ReactNode,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import {
  formatDatetimeInput,
  formatDuration,
  tryParseDatetime,
} from '@/lib/utils/formatting'
import {
  TIMERANGE_MATCHING_TOLERANCE_MULTIPLIER,
  calculateStepForDuration,
} from '@/lib/utils/sandboxes'
import type { TimeframeState } from '@/lib/utils/timeframe'

import { Button } from '@/ui/primitives/button'
import { cardVariants } from '@/ui/primitives/card'
import { Checkbox } from '@/ui/primitives/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group'
import { TimeInput, combineDateTime, parseDateTime } from '@/ui/time-picker'
import { zodResolver } from '@hookform/resolvers/zod'
import { UseFormReturn, useForm } from 'react-hook-form'

interface TimeOption {
  label: string
  value: string
  shortcut: string
  rangeMs: number
}

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

const customTimeFormSchema = z
  .object({
    startDate: z.string(),
    startTime: z.string(),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    endEnabled: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // start date and time are required
    if (!data.startDate || !data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date and time are required',
        path: ['startDate'],
      })
      return
    }

    const startDateTime = combineDateTime(data.startDate, data.startTime)
    if (!startDateTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid start date/time',
        path: ['startDate'],
      })
      return
    }

    const now = Date.now()
    const maxDaysAgo = 31 * 24 * 60 * 60 * 1000 // 31 days in ms
    const startTimestamp = startDateTime.getTime()

    // validate start date is not more than 31 days ago
    if (startTimestamp < now - maxDaysAgo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date cannot be more than 31 days ago',
        path: ['startDate'],
      })
      return
    }

    // validate start date is not in the future (with 60s tolerance for clock skew)
    if (startTimestamp > now + 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date cannot be in the future',
        path: ['startDate'],
      })
      return
    }

    // if end is enabled, validate end time
    if (data.endEnabled && data.endDate && data.endTime) {
      const endDateTime = combineDateTime(data.endDate, data.endTime)
      if (!endDateTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid end date/time',
          path: ['endDate'],
        })
        return
      }

      const endTimestamp = endDateTime.getTime()
      const minRange = 1.5 * 60 * 1000 // 1.5 minutes minimum

      // ensure end is after start
      if (endTimestamp <= startTimestamp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be after start time',
          path: ['endDate'],
        })
        return
      }

      // ensure minimum range of 1.5 minutes
      if (endTimestamp - startTimestamp < minRange) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Time range must be at least 1.5 minutes',
          path: ['endDate'],
        })
        return
      }

      // ensure end is not in the future (with 60s tolerance for clock skew)
      if (endTimestamp > now + 60 * 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date cannot be in the future',
          path: ['endDate'],
        })
        return
      }

      // ensure range doesn't exceed 31 days
      if (endTimestamp - startTimestamp > maxDaysAgo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Date range cannot exceed 31 days',
          path: ['endDate'],
        })
        return
      }
    }
  })

type CustomTimeFormValues = z.infer<typeof customTimeFormSchema>

export interface CustomTimePanelRef {
  form: UseFormReturn<CustomTimeFormValues>
  submit: () => void
  isDirty: boolean
}

interface CustomTimePanelProps {
  startDateTime: string
  endDateTime: string
  endEnabled: boolean
  isOpen: boolean
  onSubmit: (values: CustomTimeFormValues) => void
  onValuesChange: (values: CustomTimeFormValues) => void
}

const CustomTimePanel = forwardRef<CustomTimePanelRef, CustomTimePanelProps>(
  function CustomTimePanel(
    {
      startDateTime,
      endDateTime,
      endEnabled,
      isOpen,
      onSubmit,
      onValuesChange,
    },
    ref
  ) {
    'use no memo'

    const startParts = parseDateTime(startDateTime)
    const endParts = parseDateTime(endDateTime)

    const form = useForm<CustomTimeFormValues>({
      resolver: zodResolver(customTimeFormSchema),
      defaultValues: {
        startDate: startParts.date || '',
        startTime: startParts.time || '',
        endDate: endParts.date || '',
        endTime: endParts.time || '',
        endEnabled: endEnabled || false,
      },
      mode: 'onSubmit', // only validate on submit
      reValidateMode: 'onSubmit',
    })

    // track if form is dirty (being edited) to prevent external updates
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

    useEffect(() => {
      if (!isOpen) {
        setIsFocused(false)
      }
    }, [isOpen])

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

      const isExternalChange =
        propStartTime &&
        currentFormStartTime &&
        Math.abs(propStartTime - currentFormStartTime) > 1000

      const isInitialOrModeChange =
        !lastPropsRef.current.startDateTime ||
        lastPropsRef.current.endEnabled !== endEnabled

      if (isExternalChange || isInitialOrModeChange) {
        const startParts = parseDateTime(startDateTime)
        const endParts = parseDateTime(endDateTime)

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

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="p-4 flex flex-col gap-4"
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
                      onDateChange={(value) =>
                        form.setValue('startDate', value, { shouldDirty: true })
                      }
                      onTimeChange={(value) =>
                        form.setValue('startTime', value, { shouldDirty: true })
                      }
                      disabled={false}
                      showLiveIndicator={false}
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
                <div className={cn(!field.value && 'opacity-50')}>
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
                            showLiveIndicator={!field.value}
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
            className="w-fit self-end"
            variant="outline"
          >
            Apply
          </Button>
        </form>
      </Form>
    )
  }
)

interface TimePickerProps {
  value?: TimeframeState
  onValueChange?: (value: TimeframeState) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  children: ReactNode
}

export const TimePicker = memo(function TimePicker({
  value = { mode: 'live', range: 60 * 60 * 1000 }, // default 1 hour
  onValueChange,
  placeholder = 'Select period',
  className,
  disabled = false,
  children,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [customPanelSide, setCustomPanelSide] = useState<
    'left' | 'right' | 'top' | 'bottom'
  >('right')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const customPanelRef = useRef<CustomTimePanelRef>(null)
  const isUserInteractionRef = useRef(false)

  const [timeOptionsValue, setTimeOptionsValue] = useState(() => {
    let duration: number | undefined
    if (value.mode === 'live' && value.range) {
      duration = value.range
    } else if (value.mode === 'static' && value.start && value.end) {
      duration = value.end - value.start
    }

    if (duration) {
      const step = calculateStepForDuration(duration)
      const tolerance = step * TIMERANGE_MATCHING_TOLERANCE_MULTIPLIER
      const matchingOption = timeOptions.find(
        (opt) => Math.abs(opt.rangeMs - duration) < tolerance
      )
      return matchingOption?.value || ''
    }
    return ''
  })

  const [isCustomSelected, setIsCustomSelected] = useState(() => {
    let duration: number | undefined
    if (value.mode === 'live' && value.range) {
      duration = value.range
    } else if (value.mode === 'static' && value.start && value.end) {
      duration = value.end - value.start
    }

    if (duration) {
      const step = calculateStepForDuration(duration)
      const tolerance = step * TIMERANGE_MATCHING_TOLERANCE_MULTIPLIER
      const matchingOption = timeOptions.find(
        (opt) => Math.abs(opt.rangeMs - duration) < tolerance
      )
      return !matchingOption
    }
    return false
  })

  const [showCustomPanel, setShowCustomPanel] = useState(false)

  const [startDateTime, setStartDateTime] = useState(() => {
    if (value.mode === 'live' && value.range) {
      const now = new Date()
      const startTime = value.start || now.getTime() - value.range
      const start = new Date(startTime)
      return formatDatetimeInput(start)
    } else if (value.mode === 'static' && value.start) {
      return formatDatetimeInput(new Date(value.start))
    }
    return formatDatetimeInput(new Date(Date.now() - 60 * 60 * 1000))
  })
  const [startTimestamp, setStartTimestamp] = useState<number | undefined>(
    () => {
      if (value.mode === 'live' && value.range) {
        return value.start || Date.now() - value.range
      } else if (value.mode === 'static' && value.start) {
        return value.start
      }
      return Date.now() - 60 * 60 * 1000
    }
  )

  const [endDateTime, setEndDateTime] = useState(() => {
    const now = new Date()
    if (value.mode === 'static' && value.end) {
      return formatDatetimeInput(new Date(value.end))
    } else if (value.mode === 'live' && value.end) {
      return formatDatetimeInput(new Date(value.end))
    }
    return formatDatetimeInput(now)
  })
  const [endTimestamp, setEndTimestamp] = useState<number | undefined>(() => {
    if (value.mode === 'static' && value.end) {
      return value.end
    } else if (value.mode === 'live' && value.end) {
      return value.end
    }
    return Date.now()
  })

  const [endEnabled, setEndEnabled] = useState(() => value.mode === 'static')
  const isLiveMode = !endEnabled

  // initialize selection state on mount
  useEffect(() => {
    let duration: number | undefined
    if (value.mode === 'live' && value.range) {
      duration = value.range
    } else if (value.mode === 'static' && value.start && value.end) {
      duration = value.end - value.start
    }

    if (duration) {
      const step = calculateStepForDuration(duration)
      const tolerance = step * TIMERANGE_MATCHING_TOLERANCE_MULTIPLIER
      const matchingOption = timeOptions.find(
        (opt) => Math.abs(opt.rangeMs - duration) < tolerance
      )

      if (matchingOption) {
        setTimeOptionsValue(matchingOption.value)
        setIsCustomSelected(false)
      } else {
        setTimeOptionsValue('')
        setIsCustomSelected(true)
      }
    }

    setEndEnabled(value.mode === 'static')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // determine which side to show custom panel based on viewport space
  useEffect(() => {
    if (open && (showCustomPanel || isCustomSelected)) {
      // small delay to ensure dropdown is mounted and ref is attached
      const checkPosition = () => {
        if (!dropdownRef.current) {
          return
        }

        const rect = dropdownRef.current.getBoundingClientRect()
        const spaceOnRight = window.innerWidth - rect.right
        const spaceOnLeft = rect.left
        const spaceOnBottom = window.innerHeight - rect.bottom
        const spaceOnTop = rect.top

        const PANEL_WIDTH = 340 // width of custom panel
        const PANEL_HEIGHT = 280 // approximate height of custom panel

        // try horizontal positioning first
        if (spaceOnRight >= PANEL_WIDTH) {
          setCustomPanelSide('right')
        } else if (spaceOnLeft >= PANEL_WIDTH) {
          setCustomPanelSide('left')
        } else if (spaceOnBottom >= PANEL_HEIGHT) {
          // if no horizontal space, try vertical
          setCustomPanelSide('bottom')
        } else if (spaceOnTop >= PANEL_HEIGHT) {
          setCustomPanelSide('top')
        } else {
          // default to right if no space anywhere (will cause overflow)
          setCustomPanelSide('right')
        }
      }

      // try immediately
      checkPosition()

      // if ref wasn't ready, try again after a brief delay
      if (!dropdownRef.current) {
        const timer = setTimeout(checkPosition, 10)
        return () => clearTimeout(timer)
      }

      // recalculate on window resize
      window.addEventListener('resize', checkPosition)
      return () => window.removeEventListener('resize', checkPosition)
    }
  }, [open, showCustomPanel, isCustomSelected])

  // don't auto-open panel when custom is selected externally
  // panel should only open/close via user interaction

  // sync selected value with prop changes
  useEffect(() => {
    if (isUserInteractionRef.current) return

    let duration: number | undefined
    if (value.mode === 'live' && value.range) {
      duration = value.range
    } else if (value.mode === 'static' && value.start && value.end) {
      duration = value.end - value.start
    }

    if (duration) {
      const step = calculateStepForDuration(duration)
      const tolerance = step * TIMERANGE_MATCHING_TOLERANCE_MULTIPLIER
      const matchingOption = timeOptions.find(
        (opt) => Math.abs(opt.rangeMs - duration) < tolerance
      )

      if (matchingOption) {
        setTimeOptionsValue(matchingOption.value)
        setIsCustomSelected(false)
      } else {
        setTimeOptionsValue('')
        setIsCustomSelected(true)
      }
    } else {
      setTimeOptionsValue('')
      setIsCustomSelected(false)
    }

    if (value.mode === 'live' && value.range) {
      setEndEnabled(false)

      const now = new Date()
      const startTime = value.start || now.getTime() - value.range
      const start = new Date(startTime)
      const endTime = value.end || now.getTime()
      const end = new Date(endTime)

      setStartDateTime(formatDatetimeInput(start))
      setStartTimestamp(start.getTime())
      setEndDateTime(formatDatetimeInput(end))
      setEndTimestamp(end.getTime())
    } else if (value.mode === 'static' && value.start && value.end) {
      setEndEnabled(true)

      const startLocal = formatDatetimeInput(new Date(value.start))
      const endLocal = formatDatetimeInput(new Date(value.end))
      setStartDateTime(startLocal)
      setStartTimestamp(value.start)
      setEndDateTime(endLocal)
      setEndTimestamp(value.end)
    }
  }, [value])

  const handleTimeOptionSelect = useCallback(
    (newValue: string) => {
      isUserInteractionRef.current = true
      setTimeOptionsValue(newValue)
      setIsCustomSelected(false)
      setShowCustomPanel(false)

      const option = timeOptions.find((opt) => opt.value === newValue)
      if (option) {
        onValueChange?.({
          mode: 'live',
          range: option.rangeMs,
        })
        setOpen(false)
        setTimeout(() => {
          isUserInteractionRef.current = false
        }, 10)
      }
    },
    [onValueChange]
  )

  const handleCustomSelect = useCallback(() => {
    isUserInteractionRef.current = true
    setIsCustomSelected(true)
    setShowCustomPanel(true)
    setTimeOptionsValue('')

    setTimeout(() => {
      isUserInteractionRef.current = false
    }, 10)
  }, [])

  const handleCustomToggle = useCallback(() => {
    setShowCustomPanel((prev) => !prev)
  }, [])

  useEffect(() => {
    if (endEnabled && (showCustomPanel || isCustomSelected)) {
      if (endTimestamp && !endDateTime) {
        setEndDateTime(formatDatetimeInput(new Date(endTimestamp)))
      } else if (!endDateTime && !endTimestamp) {
        const now = new Date()
        const localString = formatDatetimeInput(now)
        setEndDateTime(localString)
        setEndTimestamp(now.getTime())
      }
    }
  }, [endEnabled, showCustomPanel, isCustomSelected, endTimestamp, endDateTime])

  useEffect(() => {
    if (
      (showCustomPanel || isCustomSelected) &&
      (!startDateTime || (!endDateTime && endEnabled))
    ) {
      const now = new Date()

      if (value.mode === 'live' && value.range) {
        const startTime = value.start || now.getTime() - value.range
        const start = new Date(startTime)
        const endTime = value.end || now.getTime()
        const end = new Date(endTime)

        setStartDateTime(formatDatetimeInput(start))
        setStartTimestamp(start.getTime())
        if (endEnabled) {
          setEndDateTime(formatDatetimeInput(end))
          setEndTimestamp(end.getTime())
        }
      } else if (value.mode === 'static' && value.start && value.end) {
        setStartDateTime(formatDatetimeInput(new Date(value.start)))
        setStartTimestamp(value.start)
        setEndDateTime(formatDatetimeInput(new Date(value.end)))
        setEndTimestamp(value.end)
      } else {
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        setStartDateTime(formatDatetimeInput(hourAgo))
        setStartTimestamp(hourAgo.getTime())
        if (endEnabled) {
          setEndDateTime(formatDatetimeInput(now))
          setEndTimestamp(now.getTime())
        }
      }
    }
  }, [
    showCustomPanel,
    isCustomSelected,
    startDateTime,
    endDateTime,
    endEnabled,
    value,
  ])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (
        !newOpen &&
        (showCustomPanel || isCustomSelected) &&
        !isUserInteractionRef.current
      ) {
        return
      }
      setOpen(newOpen)
      if (!newOpen) {
        setShowCustomPanel(false)
      }
    },
    [showCustomPanel, isCustomSelected]
  )

  const handleCustomSubmit = useCallback(
    (values: CustomTimeFormValues) => {
      // combine date and time values
      const startDateTimeStr = `${values.startDate} ${values.startTime}`
      const startDate = tryParseDatetime(startDateTimeStr)

      const endDateTimeStr =
        values.endEnabled && values.endDate && values.endTime
          ? `${values.endDate} ${values.endTime}`
          : null
      const endDate = endDateTimeStr ? tryParseDatetime(endDateTimeStr) : null

      if (!startDate) return

      isUserInteractionRef.current = true

      // update parent state with the final values
      setStartDateTime(startDateTimeStr || '')
      setEndDateTime(endDateTimeStr || '')
      setEndEnabled(values.endEnabled || false)

      if (values.endEnabled && endDate) {
        onValueChange?.({
          mode: 'static',
          start: startDate.getTime(),
          end: endDate.getTime(),
        })
      } else {
        const now = new Date().getTime()
        const range = now - startDate.getTime()

        const maxDaysAgo = 31 * 24 * 60 * 60 * 1000
        if (range >= -60000 && range <= maxDaysAgo) {
          const validRange = Math.max(0, range)
          onValueChange?.({
            mode: 'live',
            range: validRange || 60000,
          })
        }
      }

      setShowCustomPanel(false)
      setOpen(false)
      setTimeout(() => {
        isUserInteractionRef.current = false // reset flag after state updates
      }, 10)
    },
    [onValueChange]
  )

  const handleCustomValuesChange = useCallback(
    (values: CustomTimeFormValues) => {
      const startDateTimeStr =
        values.startDate && values.startTime
          ? `${values.startDate} ${values.startTime}`
          : null
      const startDate = startDateTimeStr
        ? tryParseDatetime(startDateTimeStr)
        : null
      setStartTimestamp(startDate?.getTime())

      const endDateTimeStr =
        values.endDate && values.endTime
          ? `${values.endDate} ${values.endTime}`
          : null
      const endDate = endDateTimeStr ? tryParseDatetime(endDateTimeStr) : null
      setEndTimestamp(endDate?.getTime())

      setEndEnabled(values.endEnabled || false)
    },
    []
  )

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        ref={dropdownRef}
        align="start"
        className="p-0 overflow-visible backdrop-blur-none"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-custom-panel]')) {
            e.preventDefault()
          } else {
            isUserInteractionRef.current = true
            setShowCustomPanel(false)
            setTimeout(() => {
              isUserInteractionRef.current = false
            }, 100)
          }
        }}
        onEscapeKeyDown={() => {
          isUserInteractionRef.current = true
          setShowCustomPanel(false)
          setTimeout(() => {
            isUserInteractionRef.current = false
          }, 100)
        }}
      >
        <div className="relative">
          <div className="w-[260px] p-2 relative z-10 backdrop-blur-lg">
            <RadioGroup
              value={timeOptionsValue}
              onValueChange={handleTimeOptionSelect}
              className="gap-0"
            >
              {timeOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-center justify-between px-2 py-1.5 cursor-pointer',
                    'hover:bg-bg-highlight transition-colors'
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

            <DropdownMenuSeparator />

            <RadioGroup
              value={isCustomSelected ? 'custom' : ''}
              onValueChange={(value) => {
                if (value === 'custom') {
                  handleCustomSelect()
                }
              }}
              onClick={() => {
                handleCustomSelect()
              }}
              className="gap-0"
            >
              <div
                className={cn(
                  'flex items-center justify-between px-2 py-1.5',
                  'hover:bg-bg-highlight transition-colors',
                  (showCustomPanel || isCustomSelected) && 'bg-bg-highlight'
                )}
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <RadioGroupItem value="custom" />
                  <span className="prose-body">Custom</span>
                </label>
                <ChevronRight
                  className={cn(
                    'size-4 text-fg-tertiary transition-transform',
                    showCustomPanel && 'rotate-90'
                  )}
                />
              </div>
            </RadioGroup>
          </div>

          <AnimatePresence mode="wait">
            {(showCustomPanel || isCustomSelected) && (
              <motion.div
                data-custom-panel
                initial={{
                  opacity: 0,
                  x:
                    customPanelSide === 'right'
                      ? -10
                      : customPanelSide === 'left'
                        ? 10
                        : 0,
                  y:
                    customPanelSide === 'bottom'
                      ? -10
                      : customPanelSide === 'top'
                        ? 10
                        : 0,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  x:
                    customPanelSide === 'right'
                      ? -10
                      : customPanelSide === 'left'
                        ? 10
                        : 0,
                  y:
                    customPanelSide === 'bottom'
                      ? -10
                      : customPanelSide === 'top'
                        ? 10
                        : 0,
                }}
                transition={{
                  duration: 0.15,
                  ease: 'easeOut',
                }}
                className={cn(
                  cardVariants({ variant: 'layer' }),
                  'backdrop-blur-lg absolute w-[340px]',
                  customPanelSide === 'right' && 'left-[260px] -top-[1px]',
                  customPanelSide === 'left' && 'right-[260px] -top-[1px]',
                  customPanelSide === 'bottom' && 'top-full left-0 mt-1',
                  customPanelSide === 'top' && 'bottom-full left-0 mb-1'
                )}
              >
                <CustomTimePanel
                  ref={customPanelRef}
                  startDateTime={startDateTime}
                  endDateTime={endDateTime}
                  endEnabled={endEnabled}
                  isOpen={showCustomPanel || isCustomSelected}
                  onSubmit={handleCustomSubmit}
                  onValuesChange={handleCustomValuesChange}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

export default TimePicker
