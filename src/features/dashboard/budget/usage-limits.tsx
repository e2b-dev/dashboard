import { cn } from '@/lib/utils'
import { getBillingLimits } from '@/server/billing/get-billing-limits'
import AlertCard from './alert-card'
import LimitCard from './limit-card'

interface UsageLimitsProps {
  className?: string
  teamId: string
}

export default async function UsageLimits({
  className,
  teamId,
}: UsageLimitsProps) {
  const res = await getBillingLimits({ teamId })

  if (!res?.data || res.serverError || res.validationErrors) {
    throw new Error(res?.serverError || 'Failed to load usage limits')
  }

  const limits = res.data

  return (
    <div className={cn('flex flex-col border-t lg:flex-row', className)}>
      <LimitCard value={limits.limit_amount_gte} className="flex-1 border-r" />
      <AlertCard value={limits.alert_amount_gte} className="flex-1" />
    </div>
  )
}
