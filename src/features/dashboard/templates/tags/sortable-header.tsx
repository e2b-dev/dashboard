'use client'

import { cn } from '@/lib/utils/ui'
import { SortAscIcon, SortDescIcon } from '@/ui/primitives/icons'

export type SortKey = 'tag' | 'createdAt'
export type SortDir = 'asc' | 'desc'

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: SortDir
  // Direction previewed on hover when this column is inactive.
  defaultDir: SortDir
  onChange: (key: SortKey) => void
}

export function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  defaultDir,
  onChange,
}: SortableHeaderProps) {
  const isActive = activeKey === sortKey
  const visibleDir = isActive ? dir : defaultDir
  const Icon = visibleDir === 'desc' ? SortDescIcon : SortAscIcon

  return (
    <button
      type="button"
      onClick={() => onChange(sortKey)}
      className={cn(
        'group/sort flex h-8 items-center gap-1 font-mono uppercase whitespace-nowrap',
        'cursor-pointer focus-visible:outline-none transition-colors',
        isActive
          ? 'prose-label-highlight text-fg'
          : 'prose-label text-fg-tertiary hover:text-fg-secondary'
      )}
    >
      {label}
      <span
        className={cn(
          'size-5 min-w-5 flex items-center justify-center',
          !isActive && 'opacity-0 group-hover/sort:opacity-100'
        )}
        aria-hidden="true"
      >
        <Icon className="size-3" />
      </span>
    </button>
  )
}
