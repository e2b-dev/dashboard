'use client'

import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { cn, exponentialSmoothing } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import HelpTooltip from './help-tooltip'
import { Badge, BadgeProps } from './primitives/badge'

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

interface LiveBadgeProps extends BadgeProps {
  className?: string
  tooltip?: string
}

export function LiveBadge({ className, ...props }: LiveBadgeProps) {
  return (
    <Badge
      variant="positive"
      className={cn('prose-label', className)}
      {...props}
    >
      <LiveDot />
      LIVE
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
    <AnimatePresence mode="wait">
      {show && (
        <motion.span
          key="live-badge-start-rate"
          variants={{
            hidden: {
              opacity: 0,
              filter: 'blur(4px)',
            },
            visible: {
              opacity: 1,
              filter: 'blur(0px)',
            },
          }}
          transition={{
            duration: 0.3,
            ease: exponentialSmoothing(5),
          }}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="ml-3"
        >
          <HelpTooltip
            classNames={{ icon: 'text-accent-positive-highlight' }}
            trigger={<LiveBadge size="sm" {...props} />}
          >
            This data tends to be 30 seconds in the past, but is requested every{' '}
            {TEAM_METRICS_POLLING_INTERVAL_MS / 1000} seconds.
          </HelpTooltip>
        </motion.span>
      )}
    </AnimatePresence>
  )
}
