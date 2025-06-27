'use client'

import { SandboxInfo } from '@/types/api'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/ui/primitives/button'
import { RefreshCw } from 'lucide-react'
import { revalidateSandboxDetailsLayout } from '@/server/sandboxes/sandbox-actions'
import { cn } from '@/lib/utils'
import HelpTooltip from '@/ui/help-tooltip'
import { motion } from 'motion/react'

interface RemainingTimeProps {
  endAt: SandboxInfo['endAt']
}

export default function RemainingTime({ endAt }: RemainingTimeProps) {
  const getRemainingSeconds = useCallback(() => {
    if (!endAt) return 0
    const endTs = typeof endAt === 'number' ? endAt : new Date(endAt).getTime()
    return Math.max(0, Math.floor((endTs - Date.now()) / 1000))
  }, [endAt])

  const [remaining, setRemaining] = useState<number>(getRemainingSeconds)

  const [isPending, startTransition] = useTransition()
  const { teamIdOrSlug, sandboxId } = useParams()

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(getRemainingSeconds())
    }, 1000)

    return () => clearInterval(id)
  }, [endAt, getRemainingSeconds])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      await revalidateSandboxDetailsLayout(
        teamIdOrSlug as string,
        sandboxId as string
      )
    })
  }, [teamIdOrSlug, sandboxId])

  return (
    <div className="flex items-center gap-2">
      <p>{formatted}</p>
      <HelpTooltip
        trigger={
          <Button
            variant="ghost"
            size="slate"
            onClick={handleRefresh}
            disabled={isPending}
            asChild
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: remaining === 0 ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ pointerEvents: remaining === 0 ? 'auto' : 'none' }}
            >
              <RefreshCw
                className={cn('size-3', {
                  'animate-spin duration-300 ease-in-out': isPending,
                })}
              />
            </motion.button>
          </Button>
        }
      >
        The sandbox may have been terminated since last refresh. Refreshing
        could make this page inaccessible if the sandbox no longer exists.
      </HelpTooltip>
    </div>
  )
}
