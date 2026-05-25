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
  /**
   * Hint shown on hover when this column is inactive. Mirrors the
   * `sortDescFirst` flag on the templates list \u2014 the inactive icon
   * previews the direction a first click will sort to.
   */
  defaultDir: SortDir
  onChange: (key: SortKey) => void
}

/**
 * Visual treatment matches the templates list header (see
 * `DataTableHead` in `src/ui/data-table.tsx`):
 *  - mono uppercase prose-label
 *  - dimmer default (`text-fg-tertiary`), brighter active
 *    (`prose-label-highlight text-fg`)
 *  - icon hidden until hover when inactive, with the direction icon
 *    of `defaultDir` previewed
 *  - active state always shows the current direction icon
 */
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
