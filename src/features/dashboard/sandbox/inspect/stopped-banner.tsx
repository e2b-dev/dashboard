'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { useTimezone } from '@/features/dashboard/timezone'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/formatting'
import {
  CardDescription,
  CardHeader,
  CardTitle,
  cardVariants,
} from '@/ui/primitives/card'
import { WarningIcon } from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'
import { useLastUpdated, useWatcherError } from './hooks/use-watcher'

interface StoppedBannerProps {
  rootNodeCount: number
}

export function StoppedBanner({ rootNodeCount }: StoppedBannerProps) {
  const { isRunning, sandboxInfo } = useSandboxContext()
  const { timezone } = useTimezone()
  const lastUpdated = useLastUpdated()
  const watcherError = useWatcherError()

  const show = useMemo(
    () => (!!watcherError || !isRunning) && rootNodeCount > 0,
    [isRunning, rootNodeCount, watcherError]
  )

  const showWatcherError = watcherError && isRunning && rootNodeCount > 0

  const stoppedLabel =
    sandboxInfo?.state === 'paused'
      ? 'Sandbox Paused'
      : sandboxInfo?.state === 'killed'
        ? 'Sandbox Killed'
        : 'Sandbox Stopped'

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className={cn(
            cardVariants({ variant: 'default' }),
            'overflow-hidden border'
          )}
        >
          <CardHeader className="p-4!">
            <CardTitle className="inline-flex items-center gap-2">
              <WarningIcon className="size-5 text-accent-warning-highlight" />
              <span className="prose-headline-small uppercase">
                {showWatcherError
                  ? 'Live filesystem updates disabled'
                  : stoppedLabel}
              </span>
            </CardTitle>
            <CardDescription>
              {showWatcherError
                ? watcherError
                : 'Filesystem data is stale and is kept locally on your device.'}
              <span className="text-fg-tertiary">
                {' '}
                Last updated:{' '}
                {lastUpdated
                  ? (formatDate(lastUpdated, { timezone, format: 'time' }) ??
                    '—')
                  : '—'}
              </span>
            </CardDescription>
          </CardHeader>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
