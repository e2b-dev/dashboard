import { cn } from '@/lib/utils'
import React from 'react'

export interface ResourceUsageProps {
  type: 'cpu' | 'mem' | 'disk'
  metrics?: number | null
  total?: number | null
  /** Display mode: 'usage' shows metrics/total, 'simple' shows only total */
  mode?: 'usage' | 'simple'
  classNames?: {
    wrapper?: string
    dot?: string
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
    const displayTotal = total ? total.toLocaleString() : 'n/a'
    return (
      <p className="text-sm text-fg-tertiary">
        <span className="text-accent-info-highlight"> {displayTotal} </span>{' '}
        {unit}
        {isCpu && total && total > 1 ? 's' : ''}
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

  const displayValue = hasMetrics ? metrics.toLocaleString() : 'n/a'
  const totalValue = total ? total.toLocaleString() : 'n/a'

  return (
    <span
      className={cn(
        'text-fg-tertiary inline w-full truncate font-mono whitespace-nowrap',
        classNames?.wrapper
      )}
    >
      {hasMetrics ? (
        <>
          <span className={textClassName}>{roundedPercentage}% </span>
          <span className={cn('text-fg-tertiary', classNames?.dot)}>·</span>
          {!isCpu && (
            <>
              <span className={textClassName}> {displayValue}</span> /
            </>
          )}
        </>
      ) : (
        <>
          <span className="text-fg-tertiary">n/a </span>
          <span className={cn('text-fg-tertiary', classNames?.dot)}>·</span>
        </>
      )}
      <span className="text-accent-info-highlight"> {totalValue} </span> {unit}
      {isCpu && total && total > 1 ? 's' : ''}
    </span>
  )
}

export default ResourceUsage
