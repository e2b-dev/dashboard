'use client'

import { InfoIcon, SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'

interface TagsHeaderProps {
  search: string
  onSearchChange: (value: string) => void
  totalCount: number
  visibleCount: number
}

export default function TagsHeader({
  search,
  onSearchChange,
  totalCount,
  visibleCount,
}: TagsHeaderProps) {
  const isFiltered = search.trim().length > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-62">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-fg-tertiary pointer-events-none" />
          <Input
            placeholder="Search by name"
            className="pl-7"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-start gap-2 bg-bg-1 border border-stroke p-2.5">
        <InfoIcon className="size-3.5 text-fg-tertiary mt-0.5 shrink-0" />
        <p className="prose-body text-fg-secondary">
          Tags identify builds and can only be assigned to one build at once.
        </p>
      </div>

      <p className="prose-body text-fg-tertiary">
        {isFiltered
          ? `${visibleCount} of ${totalCount} ${
              totalCount === 1 ? 'tag' : 'tags'
            }`
          : `${totalCount} ${totalCount === 1 ? 'tag' : 'tags'} in total`}
      </p>
    </div>
  )
}
