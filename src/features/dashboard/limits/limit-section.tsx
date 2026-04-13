'use client'

import { Bell, CircleDollarSign, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import LimitForm from './limit-form'

type LimitType = 'limit' | 'alert'

interface LimitSectionProps {
  className?: string
  email: string
  teamSlug: string
  title: string
  type: LimitType
  value: number | null
}

const currencyFormatter = new Intl.NumberFormat('en-US')

const LimitPanelIcon = ({ type }: { type: LimitType }) => {
  const iconClassName =
    type === 'limit'
      ? 'text-accent-warning-highlight'
      : 'text-accent-main-highlight'

  return (
    <div className="flex size-9 items-center justify-center rounded-full border border-stroke bg-bg-1">
      <CircleDollarSign className={cn('size-4', iconClassName)} />
    </div>
  )
}

const LimitSectionInfo = ({
  email,
  type,
  value,
}: Pick<LimitSectionProps, 'email' | 'type' | 'value'>) => {
  if (type === 'alert') {
    const alertMessage =
      value === null
        ? `Informative alert will be sent to ${email} when this threshold is reached`
        : `Informative alert will be sent to ${email} when the $${currencyFormatter.format(value)} threshold is reached`

    return (
      <p className="text-fg-secondary prose-body max-w-[450px]">
        {alertMessage}
      </p>
    )
  }

  const limitMessage =
    value === null
      ? 'All API requests are blocked after reaching this limit'
      : `All API requests are blocked after reaching $${currencyFormatter.format(value)}`

  return (
    <div className="flex flex-col gap-2">
      <p className="text-fg-secondary prose-body flex items-start gap-2">
        <TriangleAlert className="text-accent-warning-highlight mt-0.5 size-4 shrink-0" />
        <span>{limitMessage}</span>
      </p>
      <p className="text-fg-secondary prose-body flex items-start gap-2">
        <Bell className="mt-0.5 size-4 shrink-0" />
        <span>Automatic alerts at 50%, 80%, 90% and 100% sent to {email}</span>
      </p>
    </div>
  )
}

export const LimitSection = ({
  className,
  email,
  teamSlug,
  title,
  type,
  value,
}: LimitSectionProps) => {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <p className="text-fg-tertiary prose-label-highlight uppercase">
        {title}
      </p>
      <div className="bg-bg flex min-h-[72px] w-full border border-stroke">
        <div className="flex w-[56px] shrink-0 items-center justify-center border-r border-stroke px-2">
          <LimitPanelIcon type={type} />
        </div>
        <div className="min-w-0 flex-1">
          <LimitForm originalValue={value} teamSlug={teamSlug} type={type} />
        </div>
      </div>
      <LimitSectionInfo email={email} type={type} value={value} />
    </section>
  )
}
