import { Button } from '@/ui/primitives/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import { RefreshCw } from 'lucide-react'
import { Separator } from './primitives/separator'
import { PollingInterval } from '@/types/dashboard.types'
import { useEffect, useState } from 'react'

interface PollingButtonProps {
  pollingInterval: PollingInterval
  onIntervalChange: (interval: PollingInterval) => void
  isPolling?: boolean
  onRefresh: () => void
}

const intervals = [
  { value: 0, label: 'Off' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
]

export function PollingButton({
  pollingInterval,
  onIntervalChange,
  isPolling,
  onRefresh,
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
        return newTime as PollingInterval
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
    const newInterval = Number(value) as PollingInterval
    onIntervalChange(newInterval)
    setRemainingTime(newInterval) // Reset timer when interval changes
  }

  return (
    <div className="flex h-6 items-center gap-1 px-0">
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
          className={`size-3.5 ${isPolling ? 'animate-spin duration-500 ease-in-out' : ''}`}
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
