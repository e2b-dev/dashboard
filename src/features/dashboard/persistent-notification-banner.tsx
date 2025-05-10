'use client'

import { cn, exponentialSmoothing } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import { ReactNode } from 'react'

interface PersistentNotificationBannerProps {
  icon: React.ReactNode
  title: ReactNode
  isOpen: boolean
  className?: string
}

export default function PersistentNotificationBanner({
  icon,
  title,
  isOpen,
  className,
}: PersistentNotificationBannerProps) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          transition={{ duration: 0.2, ease: exponentialSmoothing(5) }}
          className={cn(
            'w-full overflow-hidden border-b border-orange-500/20 bg-orange-500/10',
            className
          )}
          suppressHydrationWarning
        >
          <div className="container flex h-full w-full items-center justify-center gap-2 px-4 py-2">
            {icon} {title}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
