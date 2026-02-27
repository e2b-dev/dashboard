import type React from 'react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/formatting'

export interface ResourceUsageProps {
  type: 'cpu' | 'mem' | 'disk'
  metrics?: number | null
  total?: number | null
  /** Display mode: 'usage' shows metrics/total, 'simple' shows only total */
  mode?: 'usage' | 'simple'
  classNames?: {
    wrapper?: string
  }
}

const ResourceUsage: React.FC<ResourceUsageProps> = ({
  type,
  metrics,
  total,
  mode = 'usage',
  classNames,
}) => {
  const isCpu = type === 'cpu'
  const isDisk = type === 'disk'
  const unit = isCpu ? 'Core' : isDisk ? 'GB' : 'MB'
  const hasMetrics = metrics !== null && metrics !== undefined

  if (mode === 'simple') {
    const hasValue = total !== null && total !== undefined && total !== 0
    const displayTotal = hasValue ? formatNumber(total) : '--'
    return (
      <p className="flex justify-end gap-1 prose-table">
        <span
          className={cn(
            'prose-table-numeric',
            hasValue ? 'text-fg-secondary' : 'text-fg-tertiary'
          )}
        >
          {displayTotal}
        </span>
        {hasValue && (
          <span className="text-fg-tertiary">
            {unit}
            {isCpu && total && total > 1 ? 's' : ''}
          </span>
        )}
      </p>
    )
  }

  const percentage = isCpu
    ? (metrics ?? 0)
    : metrics && total
      ? (metrics / total) * 100
      : 0
  const roundedPercentage = Math.round(percentage)

  const textClassName = cn(
    roundedPercentage >= (isCpu ? 90 : 95)
      ? 'text-accent-error-highlight'
      : roundedPercentage >= 70
        ? 'text-accent-warning-highlight'
        : 'text-fg'
  )

  const displayValue = hasMetrics ? formatNumber(metrics) : 'n/a'
  const totalValue = total ? formatNumber(total) : 'n/a'

  return (
    <span
      className={cn(
        'text-fg-tertiary inline w-full overflow-x-hidden whitespace-nowrap',
        classNames?.wrapper
      )}
    >
      {hasMetrics ? (
        <>
          <span className={textClassName}>{roundedPercentage}% </span>
          <span className="text-fg-tertiary mx-1">·</span>
          {!isCpu && (
            <>
              <span className={textClassName}> {displayValue}</span> /
            </>
          )}
        </>
      ) : (
        <>
          <span className="text-fg-tertiary">n/a </span>
          <span className="text-fg-tertiary mx-1">·</span>
        </>
      )}
      <span className="text-accent-info-highlight"> {totalValue} </span> {unit}
      {isCpu && total && total > 1 ? 's' : ''}
    </span>
  )
}

export default ResourceUsage
