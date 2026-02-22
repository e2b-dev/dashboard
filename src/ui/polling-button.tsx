import { usePolling } from '@/lib/hooks/use-polling'
import { cn } from '@/lib/utils'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/ui/primitives/select'
import { Separator } from '@/ui/primitives/separator'
import { RefreshCw } from 'lucide-react'

export interface PollingInterval {
  value: number
  label: string
}

export interface PollingButtonProps {
  interval: number
  onIntervalChange: (interval: number) => void
  onRefresh: () => Promise<void> | void
  isRefreshing?: boolean
  intervals: PollingInterval[]
  className?: string
}

function formatSeconds(seconds: number): string {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}M`
  }
  return `${seconds}S`
}

export function PollingButton({
  interval,
  onIntervalChange,
  onRefresh,
  isRefreshing: isRefreshingProp,
  intervals,
  className,
}: PollingButtonProps) {
  const { remainingSeconds, isRefreshing, refresh } = usePolling({
    intervalSeconds: interval,
    onRefresh,
    enabled: interval > 0,
  })

  const handleIntervalChange = (value: string) => {
    onIntervalChange(Number(value))
  }

  const concatenatedIsRefreshing = isRefreshingProp || isRefreshing

  return (
    <div className={cn('flex h-6 items-center gap-1 px-0', className)}>
      <IconButton
        onClick={refresh}
        disabled={concatenatedIsRefreshing}
        className="mr-2"
      >
        <RefreshCw
          className={cn(concatenatedIsRefreshing && 'animate-spin')}
        />
      </IconButton>

      <Separator orientation="vertical" className="h-5" />

      <Select value={interval.toString()} onValueChange={handleIntervalChange}>
        <SelectTrigger className="text-fg-secondary h-9 w-fit gap-1 border-none bg-transparent pl-2 whitespace-nowrap">
          Auto-refresh
          <span className="text-accent-main-highlight ml-1">
            {interval === 0 ? 'Off' : formatSeconds(remainingSeconds)}
          </span>
        </SelectTrigger>
        <SelectContent>
          {intervals.map((item) => (
            <SelectItem key={item.value} value={item.value.toString()}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
