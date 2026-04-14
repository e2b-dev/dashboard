'use client'

import { Bell, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlertAsciiIcon } from './alert-ascii-icon'
import { LimitAsciiIcon } from './limit-ascii-icon'
import { UsageAlertForm } from './usage-alert-form'
import { UsageLimitForm } from './usage-limit-form'

interface UsageLimitSectionProps {
  className?: string
  email: string
  teamSlug: string
  value: number | null
}

interface UsageAlertSectionProps {
  className?: string
  email: string
  teamSlug: string
  value: number | null
}

const currencyFormatter = new Intl.NumberFormat('en-US')

const LimitPanelIcon = ({ icon }: { icon: typeof LimitAsciiIcon }) => {
  const Icon = icon
  return (
    <div className="flex w-[72px] shrink-0 items-center justify-center overflow-hidden border border-stroke opacity-50">
      <Icon className="size-full" />
    </div>
  )
}

const UsageLimitSectionInfo = ({
  email,
  value,
}: Pick<UsageLimitSectionProps, 'email' | 'value'>) => {
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

const UsageAlertSectionInfo = ({
  email,
  value,
}: Pick<UsageAlertSectionProps, 'email' | 'value'>) => {
  const alertMessage =
    value === null
      ? `Informative alert will be sent to ${email} when this threshold is reached`
      : `Informative alert will be sent to ${email} when the $${currencyFormatter.format(value)} threshold is reached`

  return (
    <p className="text-fg-secondary prose-body max-w-[450px]">{alertMessage}</p>
  )
}

export const UsageLimitSection = ({
  className,
  email,
  teamSlug,
  value,
}: UsageLimitSectionProps) => {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <p className="text-fg-tertiary prose-label-highlight uppercase">
        Usage Limit
      </p>
      <div className="flex w-full">
        <LimitPanelIcon icon={LimitAsciiIcon} />
        <div className="bg-bg min-w-0 flex-1 border border-l-0 border-stroke">
          <UsageLimitForm originalValue={value} teamSlug={teamSlug} />
        </div>
      </div>
      <UsageLimitSectionInfo email={email} value={value} />
    </section>
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
      <p className="text-fg-tertiary prose-label-highlight uppercase">
        Usage Alert
      </p>
      <div className="flex w-full">
        <LimitPanelIcon icon={AlertAsciiIcon} />
        <div className="bg-bg min-w-0 flex-1 border border-l-0 border-stroke">
          <UsageAlertForm originalValue={value} teamSlug={teamSlug} />
        </div>
      </div>
      <UsageAlertSectionInfo email={email} value={value} />
    </section>
  )
}
