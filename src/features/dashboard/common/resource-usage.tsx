import React from 'react'
import { cn } from '@/lib/utils'

export interface ResourceUsageProps {
  type: 'cpu' | 'mem'
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
  const unit = isCpu ? 'Core' : 'MB'

  if (mode === 'simple') {
    const displayTotal = total ? total.toLocaleString() : 'n/a'
    return (
      <p className="text-sm">
        {displayTotal} {unit}
      </p>
    )
  }

  const percentage = metrics && total ? (metrics / total) * 100 : 0
  const roundedPercentage = Math.round(percentage)

  const textClassName = cn(
    roundedPercentage >= (isCpu ? 90 : 95)
      ? 'text-error'
      : roundedPercentage >= 70
        ? 'text-warning'
        : 'text-fg'
  )

  const displayValue = metrics ? metrics.toLocaleString() : 'n/a'
  const totalValue = total ? total.toLocaleString() : '-'

  return (
    <span
      className={cn(
        'text-fg-500 inline w-full truncate font-mono whitespace-nowrap',
        classNames?.wrapper
      )}
    >
      {metrics !== null && total !== null ? (
        <>
          <span className={textClassName}>{roundedPercentage}% </span>
          <span className="text-fg-500">·</span>
          <span className={textClassName}> {displayValue}</span> /
        </>
      ) : (
        <>
          <span className="text-fg-500">n/a </span>
          <span className="text-fg-500">·</span>
        </>
      )}
      <span className="text-contrast-1"> {totalValue} </span> {unit}
    </span>
  )
}

export default ResourceUsage
