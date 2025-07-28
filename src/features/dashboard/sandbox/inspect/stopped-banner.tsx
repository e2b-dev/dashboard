"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { CardDescription, CardHeader, CardTitle, cardVariants } from '@/ui/primitives/card'
import { useSandboxContext } from '../context'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface StoppedBannerProps {
  rootNodeCount: number
}

export function StoppedBanner({ rootNodeCount }: StoppedBannerProps) {
  const { isRunning } = useSandboxContext()

  const show = useMemo(() => !isRunning && rootNodeCount > 0, [isRunning, rootNodeCount])

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={cn(cardVariants({ variant: "default" }), "overflow-hidden border border-border-200 bg-bg-100 rounded-none",)}
        >
          <CardHeader className='py-4'>
            <CardTitle className='inline-flex items-center gap-2'>
              <AlertTriangle className='size-5 text-warning' />
              Sandbox Stopped
            </CardTitle>
            <CardDescription>
              The sandbox has been stopped.<br /> At the moment, the filesystem state you see is stale and is kept locally on your device, based on the last sandbox reports when it was still active.
            </CardDescription>
          </CardHeader>
        </motion.div>
      )
      }
    </AnimatePresence >
  )
}

