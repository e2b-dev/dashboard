'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { formatTimezoneAbbreviation } from '@/lib/utils/formatting'
import { Button } from '@/ui/primitives/button'
import { InfoIcon } from '@/ui/primitives/icons'
import { useUsageTimezone } from './usage-timezone'
import { isBillingTimezoneBannerVisible } from './usage-timezone-utils'

export function BillingTimezoneBanner({ className }: { className?: string }) {
  const { userTimezone, isPinnedToUtc, setPinnedToUtc } = useUsageTimezone()

  const userTimezoneAbbreviation = useMemo(
    () => formatTimezoneAbbreviation(new Date(), userTimezone),
    [userTimezone]
  )

  if (!isBillingTimezoneBannerVisible(userTimezone)) {
    return null
  }

  return (
    <div
      className={cn(
        'border-accent-info-highlight bg-bg-1 flex flex-wrap items-center gap-x-2 gap-y-2 border-l-[3px] py-1.5 pr-1.5 pl-3',
        className
      )}
    >
      <InfoIcon className="text-accent-info-highlight size-4 shrink-0" />
      <span className="prose-label text-fg-secondary">
        {`Billing uses UTC, which differs from your default timezone (${userTimezoneAbbreviation}).`}
      </span>
      <Button
        variant="secondary"
        size="small"
        onClick={() => setPinnedToUtc(!isPinnedToUtc)}
      >
        {isPinnedToUtc
          ? `Switch back to ${userTimezoneAbbreviation}`
          : 'View in UTC'}
      </Button>
    </div>
  )
}
