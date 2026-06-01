'use client'

import { cn } from '@/lib/utils/ui'

interface TagDialogBuildRowProps {
  label: string
  buildId: string
  dim?: boolean
}

export function TagDialogBuildRow({
  label,
  buildId,
  dim,
}: TagDialogBuildRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="prose-label-highlight uppercase text-fg-tertiary w-14 shrink-0">
        {label}
      </span>
      <span
        className={cn(
          'prose-body font-mono truncate',
          dim ? 'text-fg-tertiary' : 'text-fg-primary'
        )}
      >
        {buildId}
      </span>
    </div>
  )
}
