'use client'

import type { Table } from '@tanstack/react-table'
import { useCallback } from 'react'
import { SearchIcon } from '@/ui/primitives/icons'
import { DebouncedInput } from '@/ui/primitives/input'
import AssignTagDialog from './assign-dialog'
import { useTagTableStore } from './stores/table-store'
import type { TagGroup } from './types'

interface TagsHeaderProps {
  table: Table<TagGroup>
  teamSlug: string
  templateId: string
  templateName: string
}

export default function TagsHeader({
  table,
  teamSlug,
  templateId,
  templateName,
}: TagsHeaderProps) {
  const globalFilter = useTagTableStore((s) => s.globalFilter)
  const setGlobalFilter = useTagTableStore((s) => s.setGlobalFilter)

  const totalCount = table.options.data.length
  const visibleCount = table.getFilteredRowModel().rows.length
  const isFiltered = globalFilter.trim().length > 0

  const handleSearchChange = useCallback(
    (value: string | number) => {
      setGlobalFilter(String(value))
    },
    [setGlobalFilter]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 justify-between">
        <div className="relative w-full max-w-70">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-fg-tertiary pointer-events-none" />
          <DebouncedInput
            placeholder="Search by name"
            className="pl-[30px]"
            value={globalFilter}
            onChange={handleSearchChange}
            debounce={200}
          />
        </div>
        <AssignTagDialog
          teamSlug={teamSlug}
          templateId={templateId}
          templateName={templateName}
        />
      </div>

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
