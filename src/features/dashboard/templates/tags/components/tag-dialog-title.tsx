'use client'

import { cn } from '@/lib/utils/ui'
import { DialogTitle } from '@/ui/primitives/dialog'
import { MiddleTruncate } from '@/ui/primitives/middle-truncate'

interface TagDialogTitleProps {
  prefix?: string
  tag: string
  suffix?: string
  className?: string
  srOnly?: boolean
}

export function TagDialogTitle({
  prefix,
  tag,
  suffix,
  className,
  srOnly,
}: TagDialogTitleProps) {
  if (srOnly) {
    return (
      <DialogTitle className="sr-only">
        {prefix}‘{tag}’{suffix}
      </DialogTitle>
    )
  }

  return (
    <DialogTitle
      className={cn('flex min-w-0 items-baseline pr-6', className)}
      title={`${prefix ?? ''}‘${tag}’${suffix ?? ''}`}
    >
      {prefix ? (
        <span className="shrink-0 whitespace-pre">{prefix}</span>
      ) : null}
      <span className="shrink-0">‘</span>
      <MiddleTruncate text={tag} className="min-w-0 font-mono" />
      <span className="shrink-0">’</span>
      {suffix ? (
        <span className="shrink-0 whitespace-pre">{suffix}</span>
      ) : null}
    </DialogTitle>
  )
}
