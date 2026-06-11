'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn, EASE_IN_OUT_QUART } from '@/lib/utils/ui'

interface TagDialogStageTransitionProps {
  phase: string
  className?: string
  children: ReactNode
}

export function TagDialogStageTransition({
  phase,
  className,
  children,
}: TagDialogStageTransitionProps) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={phase}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{
          duration: reduceMotion ? 0 : 0.23,
          ease: EASE_IN_OUT_QUART,
        }}
        className={cn('flex flex-1 flex-col gap-3', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
