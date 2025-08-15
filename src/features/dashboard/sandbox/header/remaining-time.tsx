'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { RefreshCw, Square } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useSandboxContext } from '../context'

export default function RemainingTime() {
  const { sandboxInfo, isRunning, refetchSandboxInfo, isSandboxInfoLoading } =
    useSandboxContext()

  const endAt = sandboxInfo?.endAt

  const getRemainingSeconds = useCallback(() => {
    if (!endAt) return 0

    const endTs = typeof endAt === 'number' ? endAt : new Date(endAt).getTime()

    return Math.max(0, Math.floor((endTs - Date.now()) / 1000))
  }, [endAt])

  const [remaining, setRemaining] = useState<number>(getRemainingSeconds)

  useEffect(() => {
    setRemaining(getRemainingSeconds())

    const id = setInterval(() => {
      setRemaining(getRemainingSeconds())
    }, 1000)

    return () => clearInterval(id)
  }, [endAt, getRemainingSeconds])

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  const formatted = `${hours > 0 ? `${hours.toString().padStart(2, '0')}h ` : ''}${minutes
    .toString()
    .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`

  if (!isRunning) {
    return (
      <Badge>
        <Square className="size-2 fill-current" /> Stopped
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <p suppressHydrationWarning>{formatted}</p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: remaining === 0 ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: remaining === 0 ? 'auto' : 'none' }}
      >
        <Button
          variant="ghost"
          size="slate"
          onClick={refetchSandboxInfo}
          disabled={isSandboxInfoLoading}
          asChild
        >
          <RefreshCw
            className={cn('size-3', {
              'animate-spin duration-300 ease-in-out': isSandboxInfoLoading,
            })}
          />
        </Button>
      </motion.div>
    </div>
  )
}
