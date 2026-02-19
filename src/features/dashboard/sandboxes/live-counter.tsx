'use client'

import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/formatting'
import { SemiLiveBadge } from '@/ui/live'
import { AnimatedNumber } from '@/ui/primitives/animated-number'

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
        'relative inline-flex items-center gap-1.5 p-2.5 border bg-bg',
        className
      )}
    >
      <SemiLiveBadge className="mr-2.5" />

      <AnimatedNumber
        value={formatNumber(count)}
        className="prose-value-small"
      />

      <span className="prose-label text-fg-tertiary">CONCURRENT SANDBOXES</span>
    </div>
  )
}
