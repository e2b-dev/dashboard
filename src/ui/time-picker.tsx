'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, CheckCircle2, ChevronRight, XCircle } from 'lucide-react'
import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { z } from 'zod'

import { STORAGE_KEYS } from '@/configs/keys'
import { cn } from '@/lib/utils'
import {
  formatDatetimeInput,
  formatDuration,
  tryParseDatetime,
} from '@/lib/utils/formatting'
import type { TimeframeState } from '@/lib/utils/timeframe'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import CopyButton from './copy-button'
import { LiveDot } from './live'
import { Button } from './primitives/button'
import { cardVariants } from './primitives/card'
import { Checkbox } from './primitives/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './primitives/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './primitives/form'
import { Input } from './primitives/input'
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

// Schema for custom time form
const customTimeFormSchema = z
  .object({
    startDateTime: z.string(),
    endDateTime: z.string().optional(),
    endEnabled: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // start time is required and must be valid
    if (!data.startDateTime || !data.startDateTime.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time is required',
        path: ['startDateTime'],
      })
      return
    }

    const startDate = tryParseDatetime(data.startDateTime)
    if (!startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date/time format',
        path: ['startDateTime'],
      })
      return
    }

    const now = Date.now()
    const maxDaysAgo = 31 * 24 * 60 * 60 * 1000 // 31 days in ms
    const startTimestamp = startDate.getTime()

    // validate start date is not more than 31 days ago
    if (startTimestamp < now - maxDaysAgo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date cannot be more than 31 days ago',
        path: ['startDateTime'],
      })
      return
    }

    // validate start date is not in the future (with 60s tolerance for clock skew)
    if (startTimestamp > now + 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date cannot be in the future',
        path: ['startDateTime'],
      })
      return
    }

    // if end is enabled, validate end time
    if (data.endEnabled && data.endDateTime) {
      const endDate = tryParseDatetime(data.endDateTime)
      if (!endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid end date/time format',
          path: ['endDateTime'],
        })
        return
      }

      const endTimestamp = endDate.getTime()
      const minRange = 1.5 * 60 * 1000 // 1.5 minutes minimum

      // ensure end is after start
      if (endTimestamp <= startTimestamp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be after start time',
          path: ['endDateTime'],
        })
        return
      }

      // ensure minimum range of 1.5 minutes
      if (endTimestamp - startTimestamp < minRange) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Time range must be at least 1.5 minutes',
          path: ['endDateTime'],
        })
        return
      }

      // ensure end is not in the future (with 60s tolerance for clock skew)
      if (endTimestamp > now + 60 * 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date cannot be in the future',
          path: ['endDateTime'],
        })
        return
      }

      // ensure range doesn't exceed 31 days
      if (endTimestamp - startTimestamp > maxDaysAgo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Date range cannot exceed 31 days',
          path: ['endDateTime'],
        })
        return
      }
    }
  })

type CustomTimeFormValues = z.infer<typeof customTimeFormSchema>

// Custom Time Panel with react-hook-form
interface CustomTimePanelProps {
  startDateTime: string
  endDateTime: string
  endEnabled: boolean
  isOpen: boolean
  onSubmit: (values: CustomTimeFormValues) => void
  onValuesChange: (values: CustomTimeFormValues) => void
}

const CustomTimePanel = memo(function CustomTimePanel({
  startDateTime,
  endDateTime,
  endEnabled,
  isOpen,
  onSubmit,
  onValuesChange,
}: CustomTimePanelProps) {
  const form = useForm<CustomTimeFormValues>({
    resolver: zodResolver(customTimeFormSchema),
    defaultValues: {
      startDateTime: startDateTime || '',
      endDateTime: endDateTime || '',
      endEnabled: endEnabled || false,
    },
    mode: 'onChange',
    reValidateMode: 'onSubmit',
  })

  // track if form is dirty (being edited) to prevent external updates
  const [isFormDirty, setIsFormDirty] = useState(false)
  const lastPropsRef = useRef({ startDateTime, endDateTime, endEnabled })

  // clear dirty state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setIsFormDirty(false)
    }
  }, [isOpen])

  // reset form when props change from external source, but ONLY if form is not dirty
  useEffect(() => {
    // if form is dirty (user is editing), don't reset
    if (isFormDirty) {
      return
    }

    // parse timestamps to compare actual values, not just string formatting
    const currentFormStart = form.getValues('startDateTime')
    const currentFormStartTime = currentFormStart
      ? tryParseDatetime(currentFormStart)?.getTime()
      : undefined
    const propStartTime = startDateTime
      ? tryParseDatetime(startDateTime)?.getTime()
      : undefined

    // if timestamps are significantly different (> 1 second), this is an external change
    const isExternalChange =
      propStartTime &&
      currentFormStartTime &&
      Math.abs(propStartTime - currentFormStartTime) > 1000

    // also check if this is the initial mount or mode change
    const isInitialOrModeChange =
      !lastPropsRef.current.startDateTime ||
      lastPropsRef.current.endEnabled !== endEnabled

    if (isExternalChange || isInitialOrModeChange) {
      form.reset({
        startDateTime: startDateTime || '',
        endDateTime: endDateTime || '',
        endEnabled: endEnabled || false,
      })
    }

    lastPropsRef.current = { startDateTime, endDateTime, endEnabled }
  }, [startDateTime, endDateTime, endEnabled, form, isFormDirty])

  // notify parent of changes and track dirty state
  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      // mark form as dirty when user types
      if (type === 'change' && name) {
        setIsFormDirty(true)
      }
      onValuesChange(values as CustomTimeFormValues)
    })
    return () => subscription.unsubscribe()
  }, [form, onValuesChange])

  // handle form submission and clear dirty state
  const handleFormSubmit = (values: CustomTimeFormValues) => {
    setIsFormDirty(false) // clear dirty state on submit
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="p-4 flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="startDateTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="prose-label uppercase text-fg-tertiary">
                Start Time
              </FormLabel>
              <FormControl>
                <DateTimeInputField
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g '2024-01-15 14:30:00' or 'now'"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endEnabled"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="prose-label uppercase text-fg-tertiary flex items-center gap-2">
                  End Time
                  {!field.value && (
                    <span className="text-xs text-fg-tertiary flex items-center gap-1">
                      <LiveDot
                        classNames={{ circle: 'size-2', dot: 'size-1' }}
                      />
                      live
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </div>
              <FormField
                control={form.control}
                name="endDateTime"
                render={({ field: endField }) => (
                  <FormControl>
                    <div className={cn(!field.value && 'opacity-50')}>
                      <DateTimeInputField
                        value={endField.value || ''}
                        onChange={endField.onChange}
                        disabled={!field.value}
                        placeholder="e.g '2024-01-15 14:30:00' or 'now'"
                        isLive={!field.value}
                        showLiveIndicator={!field.value}
                      />
                    </div>
                  </FormControl>
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={!form.formState.isValid}
          className="w-fit self-end"
          variant="outline"
        >
          Apply
        </Button>
      </form>
    </Form>
  )
})

// DateTimeInput field component for forms
interface DateTimeInputFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  isLive?: boolean
  showLiveIndicator?: boolean
}

const DateTimeInputField = memo(function DateTimeInputField({
  value,
  onChange,
  disabled,
  placeholder,
  isLive = false,
  showLiveIndicator = false,
}: DateTimeInputFieldProps) {
  const [inputValue, setInputValue] = useState(value || '')
  const [isValidDate, setIsValidDate] = useState(() => {
    // validate initial value
    return !!value && !!tryParseDatetime(value)
  })

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      onChange(newValue)

      // validate
      const date = tryParseDatetime(newValue)
      setIsValidDate(!!date)
    },
    [onChange]
  )

  // sync external value - but only when it's a meaningful change
  useEffect(() => {
    if (value !== inputValue && value !== '') {
      setInputValue(value)
      setIsValidDate(!!tryParseDatetime(value))
    }
  }, [value, inputValue])

  const date = tryParseDatetime(inputValue)
  const isoTimestamp = date?.toISOString() || ''

  // determine display value - show 'now' for live mode when empty
  const displayValue = isLive && !inputValue ? 'now' : inputValue

  return (
    <div className="relative">
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.stopPropagation()
            // Allow default behavior for form submission
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
            'border-accent-error-highlight'
        )}
      />
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
              <CheckCircle2 className="size-4 text-accent-success-highlight" />
            </>
          ) : (
            <XCircle className="size-4 text-accent-error-highlight" />
          )
        ) : (
          <>
            {showLiveIndicator && isLive ? (
              <LiveDot classNames={{ circle: 'size-3', dot: 'size-1.5' }} />
            ) : (
              <Calendar className="size-4 text-fg-tertiary" />
            )}
          </>
        )}
      </div>
    </div>
  )
})

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
  const isUserInteractionRef = useRef(false)

  // separate states for the two radio groups
  const [timeOptionsValue, setTimeOptionsValue] = useState(() => {
    // track current time option selection
    if (value.mode === 'live' && value.range) {
      const option = timeOptions.find((opt) => opt.rangeMs === value.range)
      return option?.value || ''
    }
    return ''
  })

  const [isCustomSelected, setIsCustomSelected] = useState(() => {
    // check if custom is selected
    return (
      value.mode === 'static' ||
      (value.mode === 'live' &&
        value.range &&
        !timeOptions.find((opt) => opt.rangeMs === value.range))
    )
  })

  const [showCustomPanel, setShowCustomPanel] = useState(false)

  // custom datetime state - store as ISO strings or raw input
  const [startDateTime, setStartDateTime] = useState(() => {
    if (value.mode === 'live' && value.range) {
      // use the actual start value if provided, otherwise calculate from range
      const now = new Date()
      const startTime = value.start || now.getTime() - value.range
      const start = new Date(startTime)
      return formatDatetimeInput(start)
    } else if (value.mode === 'static' && value.start) {
      return formatDatetimeInput(new Date(value.start))
    }
    // default to 1 hour ago
    return formatDatetimeInput(new Date(Date.now() - 60 * 60 * 1000))
  })
  const [startTimestamp, setStartTimestamp] = useState<number | undefined>(
    () => {
      if (value.mode === 'live' && value.range) {
        // use the actual start value if provided, otherwise calculate from range
        return value.start || Date.now() - value.range
      } else if (value.mode === 'static' && value.start) {
        return value.start
      }
      return Date.now() - 60 * 60 * 1000
    }
  )
  // start time is always enabled - no checkbox needed
  const [endDateTime, setEndDateTime] = useState(() => {
    const now = new Date()
    if (value.mode === 'static' && value.end) {
      return formatDatetimeInput(new Date(value.end))
    } else if (value.mode === 'live' && value.end) {
      // use the actual end value if provided in live mode
      return formatDatetimeInput(new Date(value.end))
    }
    return formatDatetimeInput(now)
  })
  const [endTimestamp, setEndTimestamp] = useState<number | undefined>(() => {
    if (value.mode === 'static' && value.end) {
      return value.end
    } else if (value.mode === 'live' && value.end) {
      // use the actual end value if provided in live mode
      return value.end
    }
    return Date.now()
  })
  // end enabled determines if we're in live (disabled) or static (enabled) mode
  const [endEnabled, setEndEnabled] = useState(() => {
    // initialize based on current value mode
    return value.mode === 'static'
  })

  // track if we're in live mode for UI indicators
  const isLiveMode = !endEnabled

  // initialize showCustomPanel state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.TIME_PICKER_CUSTOM_PANEL)
      const isCustom =
        value.mode === 'static' ||
        (value.mode === 'live' &&
          value.range &&
          !timeOptions.find((opt) => opt.rangeMs === value.range))

      if (stored === 'true' || isCustom) {
        setShowCustomPanel(true)
        setIsCustomSelected(true)
        setTimeOptionsValue('') // clear time options when custom is selected
        // sync endEnabled with mode
        setEndEnabled(value.mode === 'static')
      }
    }
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // determine which side to show custom panel based on viewport space
  useEffect(() => {
    if (open && showCustomPanel) {
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
  }, [open, showCustomPanel])

  // persist custom panel state
  useEffect(() => {
    if (isCustomSelected) {
      localStorage.setItem(STORAGE_KEYS.TIME_PICKER_CUSTOM_PANEL, 'true')
      setShowCustomPanel(true)
    }
    // don't automatically close custom panel when time option changes from external
    // only close when user explicitly selects a time option (handled in handleTimeOptionSelect)
  }, [isCustomSelected])

  // update selected value when prop changes
  useEffect(() => {
    // skip if user is currently interacting
    // if (isUserInteractionRef.current) return

    if (value.mode === 'live' && value.range) {
      const option = timeOptions.find((opt) => opt.rangeMs === value.range)
      if (option) {
        setTimeOptionsValue(option.value)
        setIsCustomSelected(false)
      } else {
        // custom range
        setTimeOptionsValue('')
        setIsCustomSelected(true)
      }
      setEndEnabled(false) // live mode = end is disabled (rolling window)

      // update custom panel times for live mode
      // use the actual start value if provided, otherwise calculate from range
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
      setTimeOptionsValue('')
      setIsCustomSelected(true)
      setEndEnabled(true) // static mode = end is enabled (fixed time)
      // initialize custom inputs with current values as local datetime strings
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
      isUserInteractionRef.current = true // mark as user interaction
      setTimeOptionsValue(newValue)
      setIsCustomSelected(false) // deselect custom when time option is selected
      setShowCustomPanel(false) // close custom panel when time option is selected
      localStorage.setItem(STORAGE_KEYS.TIME_PICKER_CUSTOM_PANEL, 'false')

      // find the option and create TimeframeState
      const option = timeOptions.find((opt) => opt.value === newValue)
      if (option) {
        onValueChange?.({
          mode: 'live',
          range: option.rangeMs,
        })
        // close dropdown after time option selection
        setOpen(false)
        isUserInteractionRef.current = false // reset flag
      }
    },
    [onValueChange]
  )

  const handleCustomSelect = useCallback(() => {
    isUserInteractionRef.current = true // mark as user interaction
    setIsCustomSelected(true)
    setTimeOptionsValue('') // clear time options when custom is selected
    setShowCustomPanel(true)
    localStorage.setItem(STORAGE_KEYS.TIME_PICKER_CUSTOM_PANEL, 'true')
    isUserInteractionRef.current = false // reset flag
  }, [])

  // handle endEnabled toggle - pre-fill end date when enabling
  useEffect(() => {
    if (endEnabled && showCustomPanel) {
      // when enabling end time, ensure we have a valid end time
      // if we had a timestamp but no datetime string (from live mode), populate it
      if (endTimestamp && !endDateTime) {
        setEndDateTime(formatDatetimeInput(new Date(endTimestamp)))
      } else if (!endDateTime && !endTimestamp) {
        // if we have neither, use current time
        const now = new Date()
        const localString = formatDatetimeInput(now)
        setEndDateTime(localString)
        setEndTimestamp(now.getTime())
      }
    }
    // note: we don't clear endDateTime when disabling anymore
    // this preserves the value for when user re-enables
  }, [endEnabled, showCustomPanel, endTimestamp, endDateTime])

  // initialize custom date fields when panel opens
  useEffect(() => {
    if (showCustomPanel && (!startDateTime || (!endDateTime && endEnabled))) {
      const now = new Date()

      if (value.mode === 'live' && value.range) {
        // for live mode, use actual start/end if provided, otherwise calculate
        const startTime = value.start || now.getTime() - value.range
        const start = new Date(startTime)
        const endTime = value.end || now.getTime()
        const end = new Date(endTime)

        setStartDateTime(formatDatetimeInput(start))
        setStartTimestamp(start.getTime())
        // don't set end time for live mode - it will show 'now' placeholder
        if (endEnabled) {
          setEndDateTime(formatDatetimeInput(end))
          setEndTimestamp(end.getTime())
        }
      } else if (value.mode === 'static' && value.start && value.end) {
        // for static mode, use the existing values
        setStartDateTime(formatDatetimeInput(new Date(value.start)))
        setStartTimestamp(value.start)
        setEndDateTime(formatDatetimeInput(new Date(value.end)))
        setEndTimestamp(value.end)
      } else {
        // default to last hour
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        setStartDateTime(formatDatetimeInput(hourAgo))
        setStartTimestamp(hourAgo.getTime())
        // only set end time if end is enabled
        if (endEnabled) {
          setEndDateTime(formatDatetimeInput(now))
          setEndTimestamp(now.getTime())
        }
      }
    }
  }, [showCustomPanel, startDateTime, endDateTime, endEnabled, value])

  // handle dropdown open state changes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // prevent closing if custom panel is open and it's not a user-initiated close
      if (!newOpen && showCustomPanel && !isUserInteractionRef.current) {
        // keep dropdown open when custom panel is shown and change is external
        return
      }
      setOpen(newOpen)
    },
    [showCustomPanel]
  )

  // memoized callbacks for CustomTimePanel
  const handleCustomSubmit = useCallback(
    (values: CustomTimeFormValues) => {
      // parse the dates
      const startDate = tryParseDatetime(values.startDateTime)
      const endDate =
        values.endEnabled && values.endDateTime
          ? tryParseDatetime(values.endDateTime)
          : null

      if (!startDate) return

      isUserInteractionRef.current = true

      // update parent state with the final values
      setStartDateTime(values.startDateTime || '')
      setEndDateTime(values.endDateTime || '')
      setEndEnabled(values.endEnabled || false)

      if (values.endEnabled && endDate) {
        // static mode
        onValueChange?.({
          mode: 'static',
          start: startDate.getTime(),
          end: endDate.getTime(),
        })
      } else {
        // live mode - calculate range from start to now
        const now = new Date().getTime()
        const range = now - startDate.getTime()

        // allow any valid range within the 31-day window
        // even if it's 0 (start time = now) or slightly negative due to clock differences
        const maxDaysAgo = 31 * 24 * 60 * 60 * 1000 // 31 days in ms
        if (range >= -60000 && range <= maxDaysAgo) {
          // allow 1 minute tolerance for "future" times
          // ensure we pass a positive range
          const validRange = Math.max(0, range)
          onValueChange?.({
            mode: 'live',
            range: validRange || 60000, // default to 1 minute if exactly now
          })
        }
      }

      setOpen(false)
      setTimeout(() => {
        isUserInteractionRef.current = false
      }, 100)
    },
    [onValueChange]
  )

  const handleCustomValuesChange = useCallback(
    (values: CustomTimeFormValues) => {
      // only update timestamps for validation, don't update the actual string values
      // to avoid feedback loops when user is typing
      const startDate = values.startDateTime
        ? tryParseDatetime(values.startDateTime)
        : null
      setStartTimestamp(startDate?.getTime())

      const endDate = values.endDateTime
        ? tryParseDatetime(values.endDateTime)
        : null
      setEndTimestamp(endDate?.getTime())

      // only update endEnabled since it's a checkbox and won't cause typing issues
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
          // prevent closing when interacting with custom panel
          const target = e.target as HTMLElement
          if (target.closest('[data-custom-panel]')) {
            e.preventDefault()
          } else {
            // mark as user interaction when clicking outside
            isUserInteractionRef.current = true
            setTimeout(() => {
              isUserInteractionRef.current = false
            }, 100)
          }
        }}
        onEscapeKeyDown={() => {
          // mark as user interaction when pressing escape
          isUserInteractionRef.current = true
          setTimeout(() => {
            isUserInteractionRef.current = false
          }, 100)
        }}
      >
        <div className="relative">
          {/* main panel - time options */}
          <div className="w-[260px] p-2 relative z-10 backdrop-blur-lg">
            {/* Time options radio group */}
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

            {/* Custom option as a separate radio group */}
            <RadioGroup
              value={isCustomSelected ? 'custom' : ''}
              onValueChange={() => handleCustomSelect()}
              className="gap-0"
            >
              <label
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 cursor-pointer',
                  'hover:bg-bg-highlight transition-colors',
                  isCustomSelected && 'bg-bg-highlight'
                )}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" />
                  <span className="prose-body">Custom</span>
                </div>
                <motion.div
                  animate={{
                    rotate: showCustomPanel
                      ? customPanelSide === 'left'
                        ? -180
                        : customPanelSide === 'top'
                          ? -90
                          : customPanelSide === 'bottom'
                            ? 90
                            : 0
                      : 0,
                  }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <ChevronRight className="size-4 text-fg-tertiary" />
                </motion.div>
              </label>
            </RadioGroup>
          </div>

          {/* custom panel - date/time inputs */}
          <AnimatePresence mode="wait">
            {showCustomPanel && (
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
                  startDateTime={startDateTime}
                  endDateTime={endDateTime}
                  endEnabled={endEnabled}
                  isOpen={showCustomPanel}
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
