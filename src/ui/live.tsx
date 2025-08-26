import { cn } from '@/lib/utils'
import { Badge } from './primitives/badge'

export function LiveDot() {
  return (
    <div className="rounded-full size-3 bg-accent-positive-highlight/30  flex items-center justify-content p-0.75">
      <div className="size-full rounded-full bg-accent-positive-highlight" />
    </div>
  )
}

interface LiveBadgeProps {
  className?: string
}

export function LiveBadge({ className }: LiveBadgeProps) {
  return (
    <Badge variant="positive" className={cn('prose-label', className)}>
      <LiveDot />
      LIVE
    </Badge>
  )
}
