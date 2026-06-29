'use client'

import type { OryMessageContentProps } from '@ory/elements-react'
import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

export function OryMessageRoot({ children }: PropsWithChildren) {
  return <div className="flex flex-col gap-1">{children}</div>
}

export function OryMessageContent({ message }: OryMessageContentProps) {
  return (
    <span
      className={cn(
        'pb-5 text-sm',
        message.type === 'error'
          ? 'text-accent-error-highlight'
          : 'text-fg-tertiary'
      )}
    >
      {message.text}
    </span>
  )
}
