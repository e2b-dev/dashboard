import { cn } from '@/lib/utils'
import { formatCompactDate, formatNumber } from '@/lib/utils/formatting'
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
        'px-2 py-1 prose-label'
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
  const formattedValue = typeof value === 'number' ? formatNumber(value) : value

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
          'prose-label-highlight font-mono uppercase text-xs ',
          classNames.value || 'text-accent-info-highlight'
        )}
      >
        <span className="font-sans">{formattedValue}</span> {unit} {label}
      </div>
      {description && (
        <div
          className={cn(
            'text-xs mt-0.5',
            classNames.description || 'text-fg-tertiary/60'
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
          {formatCompactDate(new Date(timestamp).getTime())}
        </div>
      )}
    </div>
  )
}

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
          'px-2 py-1 prose-label max-w-xs truncate overflow-hidden whitespace-break-spaces'
        )}
      >
        <div className={cn('font-mono', 'text-accent-error-highlight')}>
          CONCURRENT SANDBOX LIMIT
        </div>
        <div className={cn('text-xs mt-0.5', 'text-fg-tertiary')}>
          Your plan currently allows for {formatNumber(limit)} concurrent
          sandboxes. New sandbox creation will be blocked when this limit is
          reached.
        </div>
      </div>

      // <SingleValueTooltip
      //   value={limit}
      //   label="concurrent sandboxes limit"
      //   description={`Your plan currently allows for ${limit} concurrent sandboxes. New sandbox creation will be blocked when this limit is reached.`}
      //   classNames={{
      //     container: 'max-w-xs truncate overflow-hidden',
      //     value: 'text-accent-error-highlight whitespace-break-spaces',
      //     description: 'text-fg-tertiary whitespace-break-spaces',
      //   }}
      // />
    )
  }

  return null
}
