'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { cn, exponentialSmoothing } from '@/lib/utils'
import { capitalize } from '@/lib/utils/formatting'
import { WarningIcon } from '@/ui/primitives/icons'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'
import { useDashboard } from '../context'
import { MissingPaymentMethodDialog } from './missing-payment-method-dialog'

interface TeamBlockageAlertProps {
  className?: string
}

export default function TeamBlockageAlert({
  className,
}: TeamBlockageAlertProps) {
  const { team } = useDashboard()
  const router = useRouter()
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] =
    useState(false)

  const isBillingLimit = useMemo(
    () => team.blockedReason?.toLowerCase().includes('billing limit'),
    [team.blockedReason]
  )

  const isMissingPaymentMethod = useMemo(
    () => team.isBlocked && isMissingPaymentMethodReason(team.blockedReason),
    [team.blockedReason, team.isBlocked]
  )
  const displayedBlockReason = useMemo(
    () => (team.blockedReason ? capitalize(team.blockedReason) : null),
    [team.blockedReason]
  )

  useEffect(() => {
    if (isMissingPaymentMethod) setIsPaymentMethodDialogOpen(true)
  }, [isMissingPaymentMethod])

  const handleClick = () => {
    if (isBillingLimit) {
      router.push(PROTECTED_URLS.LIMITS(team.slug))
      return
    }

    if (isMissingPaymentMethod) {
      setIsPaymentMethodDialogOpen(true)
      return
    }

    router.push('mailto:hello@e2b.dev')
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {team.isBlocked && (
          <SidebarMenuItem className={cn(className)}>
            <SidebarMenuButton
              variant="error"
              tooltip={{
                children: displayedBlockReason ?? 'Team is blocked',
                className:
                  'bg-accent-error-bg text-accent-error-highlight border-accent-error-bg',
              }}
              onClick={handleClick}
              className={cn('h-9 bg-accent-error-bg', {
                'cursor-default': !handleClick,
              })}
              asChild
            >
              <motion.button
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(8px)' }}
                transition={{ duration: 0.4, ease: exponentialSmoothing(4) }}
              >
                <WarningIcon className="size-4 group-data-[collapsible=icon]:size-5! transition-[size]" />
                <div className="flex flex-col gap-0 overflow-hidden">
                  <span className="prose-body-highlight uppercase">
                    Team is Blocked
                  </span>
                  {displayedBlockReason && (
                    <span className="text-accent-error-highlight/80 ml-0.25 truncate text-xs">
                      {displayedBlockReason}
                    </span>
                  )}
                </div>
              </motion.button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </AnimatePresence>
      <MissingPaymentMethodDialog
        open={isPaymentMethodDialogOpen}
        onOpenChange={setIsPaymentMethodDialogOpen}
      />
    </>
  )
}

const isMissingPaymentMethodReason = (reason?: string | null) => {
  if (!reason) return false

  const formattedReason = capitalize(reason).toLowerCase()

  return (
    formattedReason.includes('payment method missing') ||
    formattedReason.includes('missing payment method')
  )
}
