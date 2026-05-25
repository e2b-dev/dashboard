'use client'

import { SearchIcon } from '@/ui/primitives/icons'
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
      {/* Toolbar row. v1 omits the "Assign new tag" CTA on the right. */}
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-70">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-fg-tertiary pointer-events-none" />
          <Input
            placeholder="Search by name"
            className="pl-[30px]"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Info row \u2014 plain helper text (left) + tag count (right). */}
      <div className="flex items-center justify-between gap-4">
        <p className="prose-body text-fg-tertiary">
          Tags identify builds and can only be assigned to one build at once.{' '}
          <a
            href="https://e2b.dev/docs/template/tags"
            target="_blank"
            rel="noopener"
            className="underline-offset-2 underline"
          >
            Read more
          </a>
          .
        </p>
        <p className="prose-body text-fg-tertiary whitespace-nowrap">
          {isFiltered
            ? `${visibleCount} of ${totalCount} ${
                totalCount === 1 ? 'tag' : 'tags'
              }`
            : `${totalCount} ${totalCount === 1 ? 'tag' : 'tags'} in total`}
        </p>
      </div>
    </div>
  )
}
