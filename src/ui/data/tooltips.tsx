import { cn } from '@/lib/utils'
import { cardVariants } from '../primitives/card'

export interface TooltipItem {
  label: React.ReactNode
  value: React.ReactNode
}

interface DefaultTooltipProps {
  label?: string
  items?: TooltipItem[]
}

export default function DefaultTooltip({ label, items }: DefaultTooltipProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant: 'layer' }),
        'border shadow-xs p-3 min-w-36'
      )}
    >
      <div className="flex flex-col gap-1 w-full">
        {items?.map((item, index) => (
          <div key={index} className="flex justify-between gap-3">
            <div>{item.label}</div>
            <div>{item.value}</div>
          </div>
        ))}
        {label && (
          <span className="text-fg-tertiary prose-label mt-1">{label}</span>
        )}
      </div>
    </div>
  )
}
