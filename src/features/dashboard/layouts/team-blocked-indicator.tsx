'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { TEAM_BLOCKED_REASONS } from '@/core/modules/teams/constants'
import type { TeamBlockedReason } from '@/core/modules/teams/models'
import { useDashboard } from '@/features/dashboard/context'
import { useSessionStorage } from '@/lib/hooks/use-session-storage'
import { Button } from '@/ui/primitives/button'
import { BlockIcon } from '@/ui/primitives/icons'
import {
  MissingPaymentMethodDialog,
  VerificationRequiredDialog,
} from '../team-blocked'
import { getBlockedDialogStorageKey } from '../team-blocked/team-blocked-dialog-storage'

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

    if (reason.includes(TEAM_BLOCKED_REASONS.missingPayment)) {
      return {
        text: 'Missing payment method.',
        cta: 'Add payment method.',
        href: null,
      }
    }

    if (reason.includes(TEAM_BLOCKED_REASONS.verification)) {
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
  const [openDialog, setOpenDialog] = useState<TeamBlockedReason | null>(null)

  const message = useBlockedMessage(team.slug, team.blockedReason)
  const reason = team.blockedReason?.toLowerCase() ?? ''
  const blockedReasonDialog: TeamBlockedReason | null =
    Object.values(TEAM_BLOCKED_REASONS).find((blockedReason) =>
      reason.includes(blockedReason)
    ) ?? null
  const dismissedStorageKey = getBlockedDialogStorageKey(
    team.slug,
    blockedReasonDialog
  )
  const dismissedStorage = useSessionStorage(dismissedStorageKey)

  useEffect(() => {
    if (!blockedReasonDialog || !dismissedStorageKey) {
      setOpenDialog(null)
      return
    }

    const hasDismissedDialog = dismissedStorage.getValue() === 'true'

    if (hasDismissedDialog) {
      setOpenDialog(null)
      return
    }

    setOpenDialog(blockedReasonDialog)
  }, [blockedReasonDialog, dismissedStorageKey, dismissedStorage])

  const handleDialogAction = () => {
    setOpenDialog(blockedReasonDialog)
  }

  const handleDialogOpenChange = (open: boolean, dialog: TeamBlockedReason) => {
    if (!open) {
      dismissedStorage.setValue('true')
      setOpenDialog(null)
      return
    }

    setOpenDialog(dialog)
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
                <Button
                  className="text-accent-error-highlight underline hover:text-accent-error-highlight text-xs! font-normal!"
                  type="button"
                  variant="quaternary"
                  size="none"
                  onClick={handleDialogAction}
                >
                  {message.cta}
                </Button>
              )}
            </>
          )}
        </span>
      </div>
      <MissingPaymentMethodDialog
        open={openDialog === TEAM_BLOCKED_REASONS.missingPayment}
        onOpenChange={(open) => {
          handleDialogOpenChange(open, TEAM_BLOCKED_REASONS.missingPayment)
        }}
      />
      <VerificationRequiredDialog
        open={openDialog === TEAM_BLOCKED_REASONS.verification}
        onOpenChange={(open) => {
          handleDialogOpenChange(open, TEAM_BLOCKED_REASONS.verification)
        }}
      />
    </>
  )
}
