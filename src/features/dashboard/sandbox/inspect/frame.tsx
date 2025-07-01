'use client'

import { cn } from '@/lib/utils'
import React from 'react'

interface SandboxInspectFrameProps
  extends React.HTMLAttributes<HTMLDivElement> {
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
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-sm border',
        classNames?.frame,
        className
      )}
      {...props}
    >
      <div className={cn('h-10 w-full border-b', classNames?.header)}>
        {header}
      </div>
      {children}
    </div>
  )
}
