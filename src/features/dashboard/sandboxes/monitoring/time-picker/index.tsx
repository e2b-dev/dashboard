'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ReactNode, memo, useCallback, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import { tryParseDatetime } from '@/lib/utils/formatting'
import type { TimeframeState } from '@/lib/utils/timeframe'
import { cardVariants } from '@/ui/primitives/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group'

import { MAX_DAYS_AGO, TIME_OPTIONS } from './constants'
import {
  useDateTimeState,
  usePanelManagement,
  useTimeOptionSelection,
} from './hooks'
import { TimePanel, type TimePanelRef } from './time-panel'
import { findMatchingTimeOption, getDurationFromTimeframe } from './utils'
import type { CustomTimeFormValues } from './validation'

interface TimePickerProps {
  value?: TimeframeState
  onValueChange?: (value: TimeframeState) => void
  disabled?: boolean
  children: ReactNode
}

export const TimePicker = memo(function TimePicker({
  value = { mode: 'live', range: 60 * 60 * 1000 },
  onValueChange,
  disabled = false,
  children,
}: TimePickerProps) {
  const { timeOptionsValue, setTimeOptionsValue } =
    useTimeOptionSelection(value)

  const {
    startDateTime,
    setStartDateTime,
    endDateTime,
    setEndDateTime,
    endEnabled,
    setEndEnabled,
  } = useDateTimeState(value)

  const {
    open,
    setOpen,
    showCustomPanel,
    setShowCustomPanel,
    customPanelSide,
    dropdownRef,
  } = usePanelManagement()

  const customPanelRef = useRef<TimePanelRef>(null)

  // re-evaluate radio selection when dropdown opens
  useEffect(() => {
    if (!open) return

    // determine correct radio state based on current value
    const duration = getDurationFromTimeframe(value)
    const matchingOption = findMatchingTimeOption(duration)

    if (value.mode === 'static') {
      // static mode means custom time range
      setTimeOptionsValue('custom')
      setShowCustomPanel(true) // auto-show panel
    } else if (matchingOption) {
      // live mode with matching preset
      setTimeOptionsValue(matchingOption.value)
    } else if (duration) {
      // live mode with custom duration
      setTimeOptionsValue('custom')
      setShowCustomPanel(true)
    } else {
      // default to first option if no valid value
      const defaultOption = TIME_OPTIONS[0]
      if (defaultOption) {
        setTimeOptionsValue(defaultOption.value)
      }
    }
  }, [open, value, setTimeOptionsValue, setShowCustomPanel])

  const handleTimeOptionSelect = useCallback(
    (newValue: string) => {
      // handle custom selection differently
      // we don't want to set the time options value to custom on selection
      if (newValue === 'custom') {
        setShowCustomPanel(true)
        return
      }

      // handle preset time option selection
      setTimeOptionsValue(newValue)
      setShowCustomPanel(false)

      const option = TIME_OPTIONS.find((opt) => opt.value === newValue)
      if (option) {
        onValueChange?.({
          mode: 'live',
          range: option.rangeMs,
        })
        setOpen(false)
      }
    },
    [onValueChange, setOpen, setShowCustomPanel, setTimeOptionsValue]
  )

  const handleCustomSubmit = useCallback(
    (values: CustomTimeFormValues) => {
      const startDateTimeStr = `${values.startDate} ${values.startTime}`
      const startDate = tryParseDatetime(startDateTimeStr)

      const endDateTimeStr =
        values.endEnabled && values.endDate && values.endTime
          ? `${values.endDate} ${values.endTime}`
          : null
      const endDate = endDateTimeStr ? tryParseDatetime(endDateTimeStr) : null

      if (!startDate) return

      setStartDateTime(startDateTimeStr || '')
      setEndDateTime(endDateTimeStr || '')
      setEndEnabled(values.endEnabled || false)

      if (values.endEnabled && endDate) {
        onValueChange?.({
          mode: 'static',
          start: startDate.getTime(),
          end: endDate.getTime(),
        })
        setTimeOptionsValue('custom')
      } else {
        const now = new Date().getTime()
        const range = now - startDate.getTime()

        // ensure range is within acceptable bounds for live mode
        if (range >= -60000 && range <= MAX_DAYS_AGO) {
          const validRange = Math.max(0, range)
          onValueChange?.({
            mode: 'live',
            range: validRange || 60000,
          })

          const matchingOption = TIME_OPTIONS.find(
            (opt) => Math.abs(opt.rangeMs - (validRange || 60000)) < 1000
          )
          if (matchingOption) {
            setTimeOptionsValue(matchingOption.value)
          } else {
            setTimeOptionsValue('custom')
          }
        }
      }

      setShowCustomPanel(false)
      setOpen(false)
    },
    [
      onValueChange,
      setOpen,
      setShowCustomPanel,
      setStartDateTime,
      setEndDateTime,
      setEndEnabled,
      setTimeOptionsValue,
    ]
  )

  const handleCustomValuesChange = useCallback(
    (values: CustomTimeFormValues) => {
      // sync end enabled state with form changes
      setEndEnabled(values.endEnabled || false)
    },
    [setEndEnabled]
  )

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen)
      if (!newOpen) {
        setShowCustomPanel(false)
      }
    },
    [setOpen, setShowCustomPanel]
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
            setShowCustomPanel(false)
          }
        }}
        onEscapeKeyDown={() => {
          setShowCustomPanel(false)
        }}
      >
        <div className="relative">
          <div className="w-[260px] p-2 relative z-10 backdrop-blur-lg">
            <RadioGroup
              value={timeOptionsValue}
              onValueChange={handleTimeOptionSelect}
              className="gap-0"
            >
              {TIME_OPTIONS.map((option) => (
                <DropdownMenuItem
                  className="justify-between"
                  key={option.value}
                  onClick={() => handleTimeOptionSelect(option.value)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={option.value} />
                    <span className="prose-body">{option.label}</span>
                  </div>
                  <span className="font-mono uppercase prose-label text-fg-tertiary">
                    {option.shortcut}
                  </span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="justify-between"
                onClick={(e) => {
                  // toggle custom panel visibility
                  setShowCustomPanel((prev) => !prev)
                  e.preventDefault()
                }}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" />
                  <span className="prose-body">Custom</span>
                </div>
                <ChevronRight className="size-4 text-fg-tertiary" />
              </DropdownMenuItem>
            </RadioGroup>
          </div>

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
                  customPanelSide === 'right' &&
                    'left-[260px] -top-px -bottom-px',
                  customPanelSide === 'left' &&
                    'right-[260px] -top-px -bottom-px',
                  customPanelSide === 'bottom' && 'top-full left-0 mt-1',
                  customPanelSide === 'top' && 'bottom-full left-0 mb-1'
                )}
              >
                <TimePanel
                  ref={customPanelRef}
                  startDateTime={startDateTime}
                  endDateTime={endDateTime}
                  endEnabled={endEnabled}
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
