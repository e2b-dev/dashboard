'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { useDashboard } from '@/features/dashboard/context'
import { BlockIcon } from '@/ui/primitives/icons'

function useBlockedMessage(slug: string, blockedReason: string | null) {
  return useMemo(() => {
    const reason = blockedReason?.toLowerCase() ?? ''

    if (reason.includes('billing limit')) {
      return {
        text: 'Billing limit reached.',
        cta: 'Update limit.',
        href: PROTECTED_URLS.LIMITS(slug),
      }
    }

    if (reason.includes('missing payment method')) {
      return {
        text: 'Missing payment method.',
        cta: 'Add payment method.',
        href: PROTECTED_URLS.BILLING(slug),
      }
    }

    if (reason.includes('verification required')) {
      return {
        text: 'Verification required.',
        cta: 'Add payment method.',
        href: PROTECTED_URLS.BILLING(slug),
      }
    }

    return {
      text: blockedReason ?? 'Team suspended.',
      cta: null,
      href: null,
    }
  }, [slug, blockedReason])
}

export default function TeamBlockedIndicator() {
  const { team } = useDashboard()

  const message = useBlockedMessage(team.slug, team.blockedReason)

  if (!team.isBlocked) return null

  return (
    <div className="inline-flex shrink-0 items-center gap-1.5 text-accent-error-highlight max-md:max-w-[50%]">
      <BlockIcon className="size-4 shrink-0" />
      <span className="truncate text-xs uppercase md:prose-label">
        {message.text}
        {message.cta && message.href && (
          <>
            {' '}
            <Link href={message.href} className="underline">
              {message.cta}
            </Link>
          </>
        )}
      </span>
    </div>
  )
}
