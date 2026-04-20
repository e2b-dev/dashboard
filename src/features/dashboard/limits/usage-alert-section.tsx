'use client'

import { cn } from '@/lib/utils'
import { formatCurrencyValue } from '@/lib/utils/currency'
import { AlertAsciiIcon } from './alert-ascii-icon'
import { UsageAlertForm } from './usage-alert-form'

interface UsageAlertSectionProps {
  className?: string
  email: string
  teamSlug: string
  value: number | null
}

const UsageAlertSectionInfo = ({
  email,
  value,
}: Pick<UsageAlertSectionProps, 'email' | 'value'>) => {
  const thresholdText =
    value === null
      ? 'this threshold'
      : `the $${formatCurrencyValue(value)} threshold`

  return (
    <p className="text-fg-tertiary prose-body max-w-[450px]">
      <span>Informative alert will be sent to </span>
      <span className="prose-body-highlight">{email}</span>
      <span>
        {' when '}
        <br aria-hidden="true" />
        {thresholdText} is reached
      </span>
    </p>
  )
}

export const UsageAlertSection = ({
  className,
  email,
  teamSlug,
  value,
}: UsageAlertSectionProps) => {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <p className="text-fg prose-label-highlight uppercase">Usage Alert</p>
      <div className="flex w-full gap-2">
        <div className="flex w-[72px] shrink-0 items-center justify-center overflow-hidden border border-stroke opacity-50">
          <AlertAsciiIcon className="size-full" />
        </div>
        <div className="bg-bg min-w-0 flex-1 border border-stroke transition-colors hover:border-stroke-active focus-within:border-stroke-active focus-within:bg-bg-highlight">
          <UsageAlertForm originalValue={value} teamSlug={teamSlug} />
        </div>
      </div>
      <UsageAlertSectionInfo email={email} value={value} />
    </section>
  )
}
