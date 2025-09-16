/**
 * Custom hooks for time picker state management
 */

import type { TimeframeState } from '@/lib/utils/timeframe'
import { useEffect, useRef, useState } from 'react'
import {
  calculatePanelPosition,
  findMatchingTimeOption,
  formatTimeframeValues,
  getDurationFromTimeframe,
} from './utils'

/**
 * Hook to manage time option selection state
 */
export function useTimeOptionSelection(value: TimeframeState) {
  const [timeOptionsValue, setTimeOptionsValue] = useState(() => {
    const duration = getDurationFromTimeframe(value)
    const matchingOption = findMatchingTimeOption(duration)
    return matchingOption?.value || ''
  })

  const [isCustomSelected, setIsCustomSelected] = useState(() => {
    const duration = getDurationFromTimeframe(value)
    const matchingOption = findMatchingTimeOption(duration)
    return duration ? !matchingOption : false
  })

  // sync with external value changes
  useEffect(() => {
    const duration = getDurationFromTimeframe(value)
    const matchingOption = findMatchingTimeOption(duration)

    if (matchingOption) {
      setTimeOptionsValue(matchingOption.value)
      setIsCustomSelected(false)
    } else if (duration) {
      setTimeOptionsValue('')
      setIsCustomSelected(true)
    } else {
      setTimeOptionsValue('')
      setIsCustomSelected(false)
    }
  }, [value])

  return {
    timeOptionsValue,
    setTimeOptionsValue,
    isCustomSelected,
    setIsCustomSelected,
  }
}

/**
 * Hook to manage datetime state
 */
export function useDateTimeState(value: TimeframeState) {
  const formatted = formatTimeframeValues(value)

  const [startDateTime, setStartDateTime] = useState(formatted.startDateTime)
  const [endDateTime, setEndDateTime] = useState(formatted.endDateTime)
  const [endEnabled, setEndEnabled] = useState(value.mode === 'static')

  // sync with external value changes
  useEffect(() => {
    const formatted = formatTimeframeValues(value)
    setStartDateTime(formatted.startDateTime)
    setEndDateTime(formatted.endDateTime)
    setEndEnabled(value.mode === 'static')
  }, [value])

  return {
    startDateTime,
    setStartDateTime,
    endDateTime,
    setEndDateTime,
    endEnabled,
    setEndEnabled,
  }
}

/**
 * Hook to manage panel visibility and positioning
 */
export function usePanelManagement() {
  const [open, setOpen] = useState(false)
  const [showCustomPanel, setShowCustomPanel] = useState(false)
  const [customPanelSide, setCustomPanelSide] = useState<
    'left' | 'right' | 'top' | 'bottom'
  >('right')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // calculate panel position when it opens
  useEffect(() => {
    if (open && showCustomPanel) {
      const checkPosition = () => {
        if (dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect()
          setCustomPanelSide(calculatePanelPosition(rect))
        }
      }

      // try immediately
      checkPosition()

      // if ref wasn't ready, try again after a brief delay
      const timer = setTimeout(checkPosition, 10)

      // recalculate on window resize
      window.addEventListener('resize', checkPosition)

      return () => {
        clearTimeout(timer)
        window.removeEventListener('resize', checkPosition)
      }
    }
  }, [open, showCustomPanel])

  return {
    open,
    setOpen,
    showCustomPanel,
    setShowCustomPanel,
    customPanelSide,
    dropdownRef,
  }
}
