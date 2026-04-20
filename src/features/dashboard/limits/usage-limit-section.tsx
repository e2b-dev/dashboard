'use client'

import { cn } from '@/lib/utils'
import { formatCurrencyValue } from '@/lib/utils/currency'
import { AlertIcon, WarningIcon } from '@/ui/primitives/icons'
import { LimitAsciiIcon } from './limit-ascii-icon'
import { UsageLimitForm } from './usage-limit-form'

interface UsageLimitSectionProps {
  className?: string
  email: string
  teamSlug: string
  value: number | null
}

const UsageLimitSectionInfo = ({
  email,
  value,
}: Pick<UsageLimitSectionProps, 'email' | 'value'>) => {
  const isValueSet = value !== null
  const limitMessage = isValueSet
    ? `All API requests are blocked after reaching $${formatCurrencyValue(value)}`
    : 'All API requests are blocked after reaching this limit'

  return (
    <div className="flex flex-col gap-2">
      <p
        className={cn(
          'prose-body flex items-start gap-2',
          isValueSet ? 'text-fg' : 'text-fg-tertiary'
        )}
      >
        <WarningIcon
          className={cn(
            'mt-0.5 size-4 shrink-0',
            isValueSet ? 'text-accent-warning-highlight' : 'text-fg-tertiary'
          )}
        />
        <span>{limitMessage}</span>
      </p>
      <p className="text-fg-tertiary prose-body flex items-start gap-2">
        <AlertIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          Automatic alerts at 50%, 80%, 90% and 100% sent to{' '}
          <span className="prose-body-highlight">{email}</span>
        </span>
      </p>
    </div>
  )
}

export const UsageLimitSection = ({
  className,
  email,
  teamSlug,
  value,
}: UsageLimitSectionProps) => {
  const isValueSet = value !== null

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <p className="text-fg prose-label-highlight uppercase">Usage Limit</p>
      <div className="flex w-full gap-2">
        <div
          className={cn(
            'flex w-[72px] shrink-0 items-center justify-center overflow-hidden border border-stroke',
            !isValueSet && 'opacity-50'
          )}
        >
          <LimitAsciiIcon active={isValueSet} className="size-full" />
        </div>
        <div className="bg-bg min-w-0 flex-1 border border-stroke transition-colors hover:border-stroke-active focus-within:border-stroke-active focus-within:bg-bg-highlight">
          <UsageLimitForm originalValue={value} teamSlug={teamSlug} />
        </div>
      </div>
      <UsageLimitSectionInfo email={email} value={value} />
    </section>
  )
}
