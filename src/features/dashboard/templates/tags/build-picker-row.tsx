'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { formatTimeAgoCompact } from '@/lib/utils/formatting'
import { Label } from '@/ui/primitives/label'
import { RadioGroupItem } from '@/ui/primitives/radio-group'

interface BuildPickerRowProps {
  buildId: string
  createdAt: number
  disabled?: boolean
  dimmed?: boolean
}

function BuildPickerRowComponent({
  buildId,
  createdAt,
  disabled,
  dimmed,
}: BuildPickerRowProps) {
  const id = `build-row-${buildId}`

  return (
    <Label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-2 py-0.5 normal-case hover:bg-bg-hover',
        'transition-opacity anim-ease-appear anim-duration-fast',
        dimmed && 'opacity-50'
      )}
    >
      <RadioGroupItem id={id} value={buildId} disabled={disabled} />
      <span className="prose-table-numeric min-w-0 flex-1 truncate font-mono text-fg-secondary">
        {buildId}
      </span>
      <span className="prose-body whitespace-nowrap text-fg-tertiary">
        {formatTimeAgoCompact(Date.now() - createdAt)}
      </span>
    </Label>
  )
}

export const BuildPickerRow = memo(BuildPickerRowComponent)
