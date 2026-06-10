'use client'

import type { OryMessageContentProps } from '@ory/elements-react'
import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

// Flow-level messages (e.g. "invalid credentials"). Styled with the dashboard's
// tokens so they read correctly without Ory's theme stylesheet.
export function OryMessageRoot({ children }: PropsWithChildren) {
  return <div className="flex flex-col gap-1">{children}</div>
}

export function OryMessageContent({ message }: OryMessageContentProps) {
  return (
    <span
      className={cn(
        'prose-label',
        message.type === 'error'
          ? 'text-accent-error-highlight'
          : 'text-fg-tertiary'
      )}
    >
      {message.text}
    </span>
  )
}
