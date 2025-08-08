'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { cn, exponentialSmoothing } from '@/lib/utils'
import { SidebarMenuButton, SidebarMenuItem } from '@/ui/primitives/sidebar'
import { AlertOctagonIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

interface TeamBlockageAlertProps {
  className?: string
}

export default function TeamBlockageAlert({
  className,
}: TeamBlockageAlertProps) {
  const team = useSelectedTeam()
  const router = useRouter()

  const isBillingLimit = useMemo(
    () => team?.blocked_reason?.toLowerCase().includes('billing limit'),
    [team?.blocked_reason]
  )
  const handleClick = () => {
    if (isBillingLimit) {
      router.push(PROTECTED_URLS.BUDGET(team?.slug ?? ''))
      return
    }

    router.push('mailto:hello@e2b.dev')
  }

  return (
    <AnimatePresence mode="wait">
      {team?.is_blocked && (
        <SidebarMenuItem className={cn(className)}>
          <SidebarMenuButton
            variant="error"
            tooltip={{
              children: team?.blocked_reason ?? 'Team is blocked',
              className:
                'bg-accent-error-bg text-accent-error-highlight border-accent-error-bg',
            }}
            onClick={handleClick}
            className={cn('h-12', {
              'hover:bg-accent-error-bg cursor-default': !handleClick,
            })}
            asChild
          >
            <motion.button
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(8px)' }}
              transition={{ duration: 0.4, ease: exponentialSmoothing(4) }}
            >
              <AlertOctagonIcon className="size-6" />
              <div className="flex flex-col gap-0 overflow-hidden">
                <h6 className="">Team is Blocked</h6>
                {team?.blocked_reason && (
                  <span className="text-accent-error-highlight/80 ml-0.25 truncate text-xs">
                    {team?.blocked_reason}
                  </span>
                )}
              </div>
            </motion.button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </AnimatePresence>
  )
}
