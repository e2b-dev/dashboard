'use client'

import { memo } from 'react'
import { formatTimeAgoCompact } from '@/lib/utils/formatting'
import { Label } from '@/ui/primitives/label'
import { RadioGroupItem } from '@/ui/primitives/radio-group'

interface BuildPickerRowProps {
  buildId: string
  createdAt: number
  disabled?: boolean
}

function BuildPickerRowComponent({
  buildId,
  createdAt,
  disabled,
}: BuildPickerRowProps) {
  const id = `build-row-${buildId}`

  return (
    <div className="flex items-center gap-2 hover:bg-bg-hover py-0.5">
      <RadioGroupItem id={id} value={buildId} disabled={disabled} />
      <Label
        htmlFor={id}
        className="prose-table-numeric min-w-0 flex-1 cursor-pointer select-none truncate font-mono normal-case text-fg-secondary"
      >
        {buildId}
      </Label>
      <span className="prose-body whitespace-nowrap text-fg-tertiary">
        {formatTimeAgoCompact(Date.now() - createdAt)}
      </span>
    </div>
  )
}

export const BuildPickerRow = memo(BuildPickerRowComponent)
