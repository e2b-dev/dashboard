import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/ui/primitives/select'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Separator } from './primitives/separator'

type PollingIntervals = Array<{ value: number; label: string }>

type PollingInterval = PollingIntervals[number]['value']

export interface PollingButtonProps {
  pollingInterval: PollingInterval
  onIntervalChange: (interval: PollingInterval) => void
  isPolling?: boolean
  onRefresh: () => Promise<void> | void
  className?: string
  intervals: PollingIntervals
}

export function PollingButton({
  pollingInterval,
  onIntervalChange,
  isPolling,
  onRefresh,
  className,
  intervals,
}: PollingButtonProps) {
  const [remainingTime, setRemainingTime] = useState(pollingInterval)

  const [isTabVisible, setIsTabVisible] = useState<boolean>(
    typeof document === 'undefined' ? true : !document.hidden
  )

  useEffect(() => {
    setRemainingTime(pollingInterval)
  }, [pollingInterval])

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsTabVisible(visible)

      setRemainingTime((prev) => {
        if (!visible) return 0 as PollingIntervals[number]['value']
        return prev === 0 ? pollingInterval : prev
      })
    }

    // It is safe to access `document` here because this component only runs on the client
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const [lastRefreshTs, setLastRefreshTs] = useState<number>(Date.now())

  const { isValidating, mutate } = useSWR(
    pollingInterval === 0 ? null : ['polling-button', pollingInterval],
    async () => {
      await onRefresh()
      setLastRefreshTs(Date.now())
      return null
    },
    {
      refreshInterval: pollingInterval * 1000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
    }
  )

  const effectiveIsPolling = isPolling ?? isValidating

  useEffect(() => {
    if (pollingInterval === 0 || !isTabVisible) return

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastRefreshTs) / 1000)
      const next = Math.max(
        0,
        pollingInterval - elapsed
      ) as PollingIntervals[number]['value']
      setRemainingTime(next)
    }, 1000)

    return () => clearInterval(timer)
  }, [pollingInterval, lastRefreshTs, isTabVisible])

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      return `${Math.floor(seconds / 60)}M`
    }
    return `${seconds}S`
  }

  const handleIntervalChange = (value: string) => {
    const newInterval = Number(value) as PollingIntervals[number]['value']
    onIntervalChange(newInterval)
    setRemainingTime(newInterval) // Reset timer when interval changes
    setLastRefreshTs(Date.now())
    mutate()
  }

  return (
    <div className={cn('flex h-6 items-center gap-1 px-0', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          ;(async () => {
            await onRefresh()
            setLastRefreshTs(Date.now())
            setRemainingTime(pollingInterval) // Reset timer on manual refresh
            mutate()
          })()
        }}
        className="text-fg-tertiary h-6"
        disabled={effectiveIsPolling}
      >
        <RefreshCw
          className={`size-3.5 ${effectiveIsPolling ? 'animate-spin duration-300 ease-in-out' : ''}`}
        />
      </Button>

      <Separator orientation="vertical" className="h-5" />

      <Select
        value={pollingInterval.toString()}
        onValueChange={handleIntervalChange}
      >
        <SelectTrigger className="text-fg-secondary h-6 w-fit gap-1 border-none bg-transparent pl-2 whitespace-nowrap">
          Auto-refresh
          <span className="text-accent-main-highlight ml-1">
            {pollingInterval === 0 ? 'Off' : formatTime(remainingTime)}
          </span>
        </SelectTrigger>
        <SelectContent>
          {intervals.map((interval) => (
            <SelectItem key={interval.value} value={interval.value.toString()}>
              {interval.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
