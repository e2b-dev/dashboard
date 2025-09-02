import { cn } from '@/lib/utils'
import { Badge } from './primitives/badge'

interface LiveDotProps {
  classNames?: {
    circle?: string
    dot?: string
  }
}

export function LiveDot({ classNames }: LiveDotProps) {
  return (
    <div
      className={cn(
        'rounded-full size-3 bg-accent-positive-highlight/30 flex items-center justify-content p-0.75',
        classNames?.circle
      )}
    >
      <div
        className={cn(
          'size-full rounded-full bg-accent-positive-highlight',
          classNames?.dot
        )}
      />
    </div>
  )
}

interface LiveBadgeProps {
  className?: string
  tooltip?: string
}

export function LiveBadge({ className }: LiveBadgeProps) {
  return (
    <Badge variant="positive" className={cn('prose-label', className)}>
      <LiveDot />
      LIVE
    </Badge>
  )
}
