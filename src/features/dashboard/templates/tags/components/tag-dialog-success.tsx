'use client'

import { cn } from '@/lib/utils/ui'
import { CheckIcon } from '@/ui/primitives/icons'

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
      <p className="prose-headline-small uppercase text-fg">
        <span className="font-mono">‘{tag}’</span>
        <br />
        {message}
      </p>
    </div>
  )
}
