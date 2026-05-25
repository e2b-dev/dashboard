'use client'

import { cn } from '@/lib/utils/ui'
import { SortAscIcon, SortDescIcon, SortIcon } from '@/ui/primitives/icons'

export type SortKey = 'tag' | 'createdAt'
export type SortDir = 'asc' | 'desc'

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: SortDir
  onChange: (key: SortKey) => void
}

export function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onChange,
}: SortableHeaderProps) {
  const isActive = activeKey === sortKey
  const Icon = !isActive ? SortIcon : dir === 'asc' ? SortAscIcon : SortDescIcon

  return (
    <button
      type="button"
      onClick={() => onChange(sortKey)}
      className={cn(
        'inline-flex items-center gap-1 text-fg-secondary',
        'hover:text-fg transition-colors',
        'focus-visible:outline-none focus-visible:text-fg'
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <Icon
        className={cn(
          'size-3 transition-opacity',
          isActive ? 'opacity-100 text-fg' : 'opacity-50'
        )}
      />
    </button>
  )
}
