import { cn } from '@/lib/utils'
import { formatDecimal, formatNumber } from '@/lib/utils/formatting'

const CPU_ERROR_PCT = 90
const CAPACITY_ERROR_PCT = 95
const WARNING_PCT = 70

const USAGE_WRAPPER_CLASSNAME =
  'text-fg-tertiary inline w-full overflow-x-hidden whitespace-nowrap'

const usageToneClassName = (pct: number, errorAt: number) =>
  pct >= errorAt
    ? 'text-accent-error-highlight'
    : pct >= WARNING_PCT
      ? 'text-accent-warning-highlight'
      : 'text-fg'

interface CpuUsageProps {
  usedPct?: number | null
  cores?: number | null
  className?: string
}

// 38% · 2 Core
export function CpuUsage({ usedPct, cores, className }: CpuUsageProps) {
  const hasUsage = usedPct !== null && usedPct !== undefined
  const pct = Math.round(usedPct ?? 0)

  return (
    <span className={cn(USAGE_WRAPPER_CLASSNAME, className)}>
      {hasUsage ? (
        <span
          className={cn(
            'font-mono inline-flex',
            usageToneClassName(pct, CPU_ERROR_PCT)
          )}
        >
          {pct}%{' '}
        </span>
      ) : (
        <span className="text-fg-tertiary">--</span>
      )}
      <span className="text-fg-tertiary mx-1.5">·</span>
      <span className="text-fg-tertiary">
        {cores ? formatNumber(cores) : '--'} Core
      </span>
    </span>
  )
}

const truncateToOneDecimal = (value: number) => Math.trunc(value * 10) / 10

const formatAmount = (value: number) =>
  formatNumber(truncateToOneDecimal(value), 'en-US', 1)

interface CapacityUsageProps {
  usedGb?: number | null
  totalGb?: number | null
  className?: string
}

// 16% · 0.5 / 4 GB
export function CapacityUsage({
  usedGb,
  totalGb,
  className,
}: CapacityUsageProps) {
  const hasUsage = usedGb !== null && usedGb !== undefined
  const pct = Math.round(hasUsage && totalGb ? (usedGb / totalGb) * 100 : 0)
  const toneClassName = usageToneClassName(pct, CAPACITY_ERROR_PCT)

  return (
    <span className={cn(USAGE_WRAPPER_CLASSNAME, className)}>
      {hasUsage ? (
        <>
          <span className={cn('font-mono inline-flex', toneClassName)}>
            {pct}%{' '}
          </span>
          <span className="text-fg-tertiary mx-1.5">·</span>
          <span className="font-mono inline-flex text-fg-tertiary">
            {formatDecimal(truncateToOneDecimal(usedGb), 1)}
          </span>{' '}
          /{' '}
        </>
      ) : (
        <>
          <span className="text-fg-tertiary">--</span>
          <span className="text-fg-tertiary mx-1.5">·</span>
        </>
      )}
      <span className="text-fg-tertiary">
        {totalGb ? formatAmount(totalGb) : '--'} GB
      </span>
    </span>
  )
}

interface ResourceSpecProps {
  value?: number | null
  unit: 'Core' | 'MB' | 'GB'
  className?: string
}

// Allocation only, e.g. 2 Core / 4 GB — for paused sandboxes and build specs.
export function ResourceSpec({ value, unit, className }: ResourceSpecProps) {
  const hasValue = value !== null && value !== undefined && value !== 0

  return (
    <p className={cn('flex justify-end gap-1 prose-table', className)}>
      <span
        className={cn(
          'prose-table-numeric',
          hasValue ? 'text-fg-secondary' : 'text-fg-tertiary'
        )}
      >
        {hasValue ? formatAmount(value) : '--'}
      </span>
      {hasValue && <span className="text-fg-tertiary">{unit}</span>}
    </p>
  )
}
