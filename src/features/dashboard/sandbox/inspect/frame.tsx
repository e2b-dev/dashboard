'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import React from 'react'

type SandboxInspectFrameProps = React.ComponentProps<typeof motion.div> & {
  header: React.ReactNode
  classNames?: {
    frame?: string
    header?: string
  }
}

export default function SandboxInspectFrame({
  className,
  classNames,
  children,
  header,
  ...props
}: SandboxInspectFrameProps) {
  return (
    <motion.div
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={cn(
        'bg-bg flex h-full min-h-0 flex-1 flex-col overflow-hidden border',
        classNames?.frame,
        className
      )}
      {...props}
    >
      <div className={cn('h-10 w-full border-b', classNames?.header)}>
        {header}
      </div>
      {children as React.ReactNode}
    </motion.div>
  )
}
