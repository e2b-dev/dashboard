import type * as React from 'react'
import { cn } from '@/lib/utils/ui'

const DEFAULT_TAIL_CHARS = 6

export interface MiddleTruncateProps extends React.ComponentProps<'span'> {
  text: string
  tail?: number
}

export function MiddleTruncate({
  text,
  tail = DEFAULT_TAIL_CHARS,
  className,
  ...props
}: MiddleTruncateProps) {
  if (text.length <= tail * 2) {
    return (
      <span className={cn('truncate', className)} {...props}>
        {text}
      </span>
    )
  }

  const head = text.slice(0, -tail)
  const end = text.slice(-tail)

  return (
    <span className={cn('flex min-w-0 max-w-full', className)} {...props}>
      <span className="truncate">{head}</span>
      <span className="shrink-0 whitespace-pre">{end}</span>
    </span>
  )
}
