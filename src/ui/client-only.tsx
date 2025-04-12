'use client'

import useIsMounted from '@/lib/hooks/use-is-mounted'
import { AnimatePresence, motion } from 'motion/react'

export interface ClientOnlyProps {
  children: React.ReactNode
  className?: string
  disable?: boolean
}

export default function ClientOnly({
  children,
  className,
  disable = false,
}: ClientOnlyProps) {
  const isMounted = useIsMounted()

  if (disable) {
    return children
  }

  return (
    <AnimatePresence>
      {isMounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: 'easeInOut' }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
