'use client'

import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { cn } from '@/lib/utils'
import HelpTooltip from './help-tooltip'
import { Badge, BadgeProps } from './primitives/badge'

interface LiveDotProps {
  classNames?: {
    circle?: string
    dot?: string
  }
  paused?: boolean
}

export function LiveDot({ classNames, paused = false }: LiveDotProps) {
  return (
    <div
      className={cn(
        'rounded-full transition-all duration-200 size-3 bg-accent-positive-highlight/30 flex items-center justify-center p-0.75',
        {
          'bg-black/00': paused,
        },
        classNames?.circle
      )}
    >
      <div
        className={cn(
          'w-1.25 h-1.25 rounded-full bg-accent-positive-highlight transition-all duration-200',
          {
            'bg-icon-secondary': paused,
          },
          classNames?.dot
        )}
      />
    </div>
  )
}

interface LiveBadgeProps extends BadgeProps {
  className?: string
  tooltip?: string
  paused?: boolean
}

export function LiveBadge({
  className,
  paused = false,
  ...props
}: LiveBadgeProps) {
  return (
    <Badge
      variant="positive"
      typography="regular"
      className={cn(
        'transition-all duration-200',
        {
          'text-fg-secondary bg-fill': paused,
        },
        className
      )}
      {...props}
    >
      <LiveDot paused={paused} />
      {paused ? 'PAUSED' : 'LIVE'}
    </Badge>
  )
}

export function SemiLiveBadge({ className, ...props }: LiveBadgeProps) {
  return (
    <HelpTooltip
      classNames={{ icon: 'text-accent-positive-highlight' }}
      trigger={<LiveBadge size="sm" className={className} {...props} />}
    >
      This data tends to be 30 seconds in the past, but is requested every{' '}
      {TEAM_METRICS_POLLING_INTERVAL_MS / 1000} seconds.
    </HelpTooltip>
  )
}

interface ReactiveLiveBadgeProps extends LiveBadgeProps {
  show: boolean
}

export function ReactiveLiveBadge({
  className,
  show,
  ...props
}: ReactiveLiveBadgeProps) {
  return (
    <HelpTooltip
      classNames={{
        icon: show ? 'text-accent-positive-highlight' : 'text-icon-secondary',
      }}
      trigger={
        <LiveBadge size="sm" paused={!show} className={className} {...props} />
      }
    >
      {show
        ? `This data tends to be 30 seconds in the past, but is requested every ${TEAM_METRICS_POLLING_INTERVAL_MS / 1000} seconds.`
        : 'Live updates are currently paused, because you selected a specific time range.'}
    </HelpTooltip>
  )
}
