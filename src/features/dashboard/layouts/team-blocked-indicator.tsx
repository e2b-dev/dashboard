'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { useDashboard } from '@/features/dashboard/context'
import { BlockIcon } from '@/ui/primitives/icons'

export default function TeamBlockedIndicator() {
  const { team } = useDashboard()

  const isBillingLimit = useMemo(
    () => team.blockedReason?.toLowerCase().includes('billing limit'),
    [team.blockedReason]
  )

  if (!team.isBlocked) return null

  return (
    <div className="inline-flex shrink-0 items-center gap-1.5 text-accent-error-highlight max-md:max-w-[50%]">
      <BlockIcon className="size-4 shrink-0" />
      <span className="truncate text-xs uppercase md:prose-label">
        {isBillingLimit ? (
          <>
            Team suspended.{' '}
            <Link href={PROTECTED_URLS.LIMITS(team.slug)} className="underline">
              Settle outstanding payment.
            </Link>
          </>
        ) : (
          <>
            Team suspended—overdue payment.{' '}
            <Link
              href={PROTECTED_URLS.BILLING(team.slug)}
              className="underline"
            >
              Pay now.
            </Link>
          </>
        )}
      </span>
    </div>
  )
}
