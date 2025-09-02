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

interface SingleValueTooltipProps {
  value: number | string
  label: string
  unit?: string
  timestamp?: string | number | Date
  description?: string
  classNames?: {
    container?: string
    value?: string
    timestamp?: string
    description?: string
  }
}

export function SingleValueTooltip({
  value,
  label,
  unit = '',
  timestamp,
  description,
  classNames = {},
}: SingleValueTooltipProps) {
  const formattedValue =
    typeof value === 'number' ? value.toLocaleString() : value

  return (
    <div
      className={cn(
        cardVariants({ variant: 'layer' }),
        'px-2 py-1 prose-label',
        classNames.container
      )}
    >
      <div
        className={cn(
          'font-medium',
          classNames.value || 'text-accent-main-highlight'
        )}
      >
        {formattedValue} {unit} {label}
      </div>
      {description && (
        <div
          className={cn(
            'text-xs mt-0.5',
            classNames.description || 'text-fg-tertiary'
          )}
        >
          {description}
        </div>
      )}
      {timestamp && (
        <div
          className={cn(
            'text-xs mt-1',
            classNames.timestamp || 'text-fg-tertiary'
          )}
        >
          {new Date(timestamp).toLocaleString()}
        </div>
      )}
    </div>
  )
}
