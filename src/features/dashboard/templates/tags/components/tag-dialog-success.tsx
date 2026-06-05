'use client'

import { cn } from '@/lib/utils/ui'
import { CheckIcon } from '@/ui/primitives/icons'
import { MiddleTruncate } from '@/ui/primitives/middle-truncate'

interface TagDialogSuccessProps {
  tag: string
  message: string
  className?: string
}

export function TagDialogSuccess({
  tag,
  message,
  className,
}: TagDialogSuccessProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 text-center',
        className
      )}
    >
      <CheckIcon className="size-12 text-accent-positive-highlight" />
      <p className="prose-headline-small text-fg max-w-full uppercase">
        <span
          className="flex max-w-full items-baseline justify-center font-mono"
          title={`‘${tag}’`}
        >
          <span className="shrink-0">‘</span>
          <MiddleTruncate tail={10} text={tag} className="min-w-0" />
          <span className="shrink-0">’</span>
        </span>
        {message}
      </p>
    </div>
  )
}
