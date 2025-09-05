'use client'

import { formatNumber } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import { SemiLiveBadge } from '@/ui/live'
import { Circle } from 'lucide-react'

interface LiveSandboxCounterProps {
  count: number
  className?: string
}

export function LiveSandboxCounter({
  count,
  className,
}: LiveSandboxCounterProps) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-2 border bg-bg p-2',
        className
      )}
    >
      <SemiLiveBadge className="" />

      <span className="prose-value-small">{formatNumber(count)}</span>

      <span className="prose-label text-fg-tertiary">CONCURRENT SANDBOXES</span>
    </div>
  )
}

// compact version for inline use
interface CompactLiveSandboxCounterProps {
  count: number
  className?: string
}

export function CompactLiveSandboxCounter({
  count,
  className,
}: CompactLiveSandboxCounterProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md border bg-bg-1 px-3 py-1.5',
        className
      )}
    >
      <Circle className="size-2 fill-accent-positive-highlight text-accent-positive-highlight animate-pulse" />
      <span className="prose-body-highlight">{formatNumber(count)}</span>
      <span className="prose-label text-fg-tertiary">LIVE</span>
    </div>
  )
}
