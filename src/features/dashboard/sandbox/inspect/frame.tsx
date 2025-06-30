'use client'

import { cn } from '@/lib/utils'
import React from 'react'

interface SandboxInspectFrameProps
  extends React.HTMLAttributes<HTMLDivElement> {
  header: React.ReactNode
}

export default function SandboxInspectFrame({
  className,
  children,
  header,
  ...props
}: SandboxInspectFrameProps) {
  return (
    <div
      className={cn(
        'border-border/80 flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-sm border',
        className
      )}
      {...props}
    >
      <div className="bg-bg-100 h-11 w-full border-b p-2">{header}</div>
      {children}
    </div>
  )
}
