'use client'

import { useCallback, useEffect, useRef } from 'react'

interface UseAlignedRefetchIntervalOptions {
  intervalMs?: number
  realignOnFocus?: boolean
}

export function getMsUntilNextAlignedInterval(
  intervalMs: number,
  nowMs: number = Date.now()
): number {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return 0
  }

  const remainder = nowMs % intervalMs
  if (remainder === 0) {
    return intervalMs
  }

  return intervalMs - remainder
}

export function useAlignedRefetchInterval({
  intervalMs = 5_000,
  realignOnFocus = true,
}: UseAlignedRefetchIntervalOptions) {
  const shouldAlignNextIntervalRef = useRef(true)
  const wasEnabledRef = useRef(false)
  const previousIntervalMsRef = useRef(intervalMs)

  useEffect(() => {
    if (!realignOnFocus) {
      return
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        shouldAlignNextIntervalRef.current = true
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [realignOnFocus])

  return useCallback(
    (enabled: boolean): number | false => {
      if (previousIntervalMsRef.current !== intervalMs) {
        previousIntervalMsRef.current = intervalMs
        shouldAlignNextIntervalRef.current = true
        wasEnabledRef.current = false
      }

      if (!enabled) {
        wasEnabledRef.current = false
        shouldAlignNextIntervalRef.current = true
        return false
      }

      if (!wasEnabledRef.current) {
        wasEnabledRef.current = true
        shouldAlignNextIntervalRef.current = true
      }

      if (shouldAlignNextIntervalRef.current) {
        shouldAlignNextIntervalRef.current = false
        return getMsUntilNextAlignedInterval(intervalMs)
      }

      return intervalMs
    },
    [intervalMs]
  )
}
