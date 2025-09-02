import { cn } from '@/lib/utils'
import { cardVariants } from '../primitives/card'

interface LimitLineTooltipProps {
  value: number
  limit: number
}

export function LimitLineTooltip({ value, limit }: LimitLineTooltipProps) {
  const isLimit = value === limit

  if (isLimit) {
    return (
      <div
        className={cn(
          cardVariants({ variant: 'layer' }),
          'border shadow-xs p-3 min-w-36'
        )}
      >
        <div className="flex flex-col gap-1 w-full prose-label">
          <div className="flex items-center gap-2">
            <span className="text-accent-error-highlight">
              Your concurrent sandbox limit
            </span>
          </div>
          <div className="text-fg-secondary">
            Maximum: {limit} concurrent sandboxes
          </div>
          <span className="text-fg-tertiary prose-label mt-1">
            New sandbox creation will be blocked when this limit is reached.
          </span>
        </div>
      </div>
    )
  }

  return null
}
