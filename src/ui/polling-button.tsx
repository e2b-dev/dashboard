import { Button } from '@/ui/primitives/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/ui/primitives/select'
import { RefreshCw } from 'lucide-react'
import { Separator } from './primitives/separator'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type PollingIntervals = Array<{ value: number; label: string }>

type PollingInterval = PollingIntervals[number]['value']

export interface PollingButtonProps {
  pollingInterval: PollingInterval
  onIntervalChange: (interval: PollingInterval) => void
  isPolling?: boolean
  onRefresh: () => void
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

  useEffect(() => {
    setRemainingTime(pollingInterval)
  }, [pollingInterval])

  useEffect(() => {
    if (pollingInterval === 0) return

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          onRefresh()
          return pollingInterval
        }
        const newTime = prev - 1
        return newTime as PollingIntervals[number]['value']
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [pollingInterval, onRefresh])

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
  }

  return (
    <div className={cn('flex h-6 items-center gap-1 px-0', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onRefresh()
          setRemainingTime(pollingInterval) // Reset timer on manual refresh
        }}
        className="text-fg-500 h-6"
        disabled={isPolling}
      >
        <RefreshCw
          className={`size-3.5 ${isPolling ? 'animate-spin duration-300 ease-in-out' : ''}`}
        />
      </Button>

      <Separator orientation="vertical" className="h-5" />

      <Select
        value={pollingInterval.toString()}
        onValueChange={handleIntervalChange}
      >
        <SelectTrigger className="text-fg-300 h-6 w-fit gap-1 border-none bg-transparent pl-2 whitespace-nowrap">
          Auto-refresh
          <span className="text-accent ml-1">
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
