'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { useDashboard } from '@/features/dashboard/context'
import { BlockIcon } from '@/ui/primitives/icons'
import { MissingPaymentMethodDialog } from '../sidebar/missing-payment-method-dialog'
import { VerificationRequiredDialog } from '../sidebar/verification-required-dialog'

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
        href: null,
      }
    }

    if (reason.includes('verification required')) {
      return {
        text: 'Verification required.',
        cta: 'Complete verification.',
        href: null,
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
  const [
    isMissingPaymentMethodDialogOpen,
    setIsMissingPaymentMethodDialogOpen,
  ] = useState(false)
  const [
    isVerificationRequiredDialogOpen,
    setIsVerificationRequiredDialogOpen,
  ] = useState(false)

  const message = useBlockedMessage(team.slug, team.blockedReason)
  const reason = team.blockedReason?.toLowerCase() ?? ''
  const isMissingPaymentMethod = reason.includes('missing payment method')
  const isVerificationRequired = reason.includes('verification required')

  useEffect(() => {
    if (isMissingPaymentMethod) setIsMissingPaymentMethodDialogOpen(true)
    if (isVerificationRequired) setIsVerificationRequiredDialogOpen(true)
  }, [isMissingPaymentMethod, isVerificationRequired])

  const handleDialogAction = () => {
    if (isMissingPaymentMethod) {
      setIsMissingPaymentMethodDialogOpen(true)
      return
    }

    if (isVerificationRequired) setIsVerificationRequiredDialogOpen(true)
  }

  if (!team.isBlocked) return null

  return (
    <>
      <div className="inline-flex shrink-0 items-center gap-1.5 text-accent-error-highlight max-md:max-w-[50%]">
        <BlockIcon className="size-4 shrink-0" />
        <span className="truncate text-xs uppercase md:prose-label">
          {message.text}
          {message.cta && (
            <>
              {' '}
              {message.href ? (
                <Link href={message.href} className="underline">
                  {message.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  className="cursor-pointer underline"
                  onClick={handleDialogAction}
                >
                  {message.cta}
                </button>
              )}
            </>
          )}
        </span>
      </div>
      <MissingPaymentMethodDialog
        open={isMissingPaymentMethodDialogOpen}
        onOpenChange={setIsMissingPaymentMethodDialogOpen}
      />
      <VerificationRequiredDialog
        open={isVerificationRequiredDialogOpen}
        onOpenChange={setIsVerificationRequiredDialogOpen}
      />
    </>
  )
}
