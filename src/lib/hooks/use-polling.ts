import { useCallback, useEffect, useRef, useState } from 'react'

interface UsePollingOptions {
  intervalSeconds: number
  onRefresh: () => Promise<void> | void
  enabled?: boolean
}

export function usePolling({
  intervalSeconds,
  onRefresh,
  enabled = true,
}: UsePollingOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(intervalSeconds)
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden
  )
  const onRefreshRef = useRef(onRefresh)

  // keep ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  // track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsTabVisible(visible)

      // reset countdown when tab becomes visible
      if (visible) {
        setRemainingSeconds(intervalSeconds)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [intervalSeconds])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefreshRef.current()
    } finally {
      setIsRefreshing(false)
      setRemainingSeconds(intervalSeconds)
    }
  }, [intervalSeconds])

  // auto-refresh interval (only when tab is visible)
  useEffect(() => {
    if (!enabled || !isTabVisible || intervalSeconds === 0) return

    const timer = setInterval(handleRefresh, intervalSeconds * 1000)
    return () => clearInterval(timer)
  }, [intervalSeconds, enabled, isTabVisible, handleRefresh])

  // countdown timer (only when tab is visible)
  useEffect(() => {
    if (!isTabVisible || intervalSeconds === 0) return

    const countdown = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1
        return next <= 0 ? intervalSeconds : next
      })
    }, 1000)

    return () => clearInterval(countdown)
  }, [intervalSeconds, isTabVisible])

  // reset countdown when interval changes
  useEffect(() => {
    setRemainingSeconds(intervalSeconds)
  }, [intervalSeconds])

  return {
    remainingSeconds,
    isRefreshing,
    refresh: handleRefresh,
  }
}
