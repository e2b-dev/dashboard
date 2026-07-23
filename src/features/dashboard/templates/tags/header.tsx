'use client'

import { useCallback, useId } from 'react'
import { cn } from '@/lib/utils'
import { SearchIcon } from '@/ui/primitives/icons'
import { DebouncedInput } from '@/ui/primitives/input'
import AssignTagDialog from './assign-dialog'
import { useTagTableStore } from './stores/table-store'
import { TAG_SEARCH_MAX_LEN, trackTagTableInteraction } from './table-config'
import TagFormatInvalidTooltip from './tag-format-invalid-tooltip'

interface TagsHeaderProps {
  templateId: string
  templateName: string
  total: number | undefined
  hasSearch: boolean
  searchInvalid: boolean
}

export default function TagsHeader({
  templateId,
  templateName,
  total,
  hasSearch,
  searchInvalid,
}: TagsHeaderProps) {
  const searchId = useId()
  const globalFilter = useTagTableStore((s) => s.globalFilter)
  const setGlobalFilter = useTagTableStore((s) => s.setGlobalFilter)

  const handleSearchChange = useCallback(
    (value: string | number) => {
      const next = String(value)
      if (next !== globalFilter) {
        trackTagTableInteraction('searched', {
          has_query: Boolean(next),
          query: next,
        })
      }
      setGlobalFilter(next)
    },
    [globalFilter, setGlobalFilter]
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 justify-between">
        <div className="w-full max-w-70">
          <label
            htmlFor={searchId}
            className={cn(
              'flex h-9 w-full min-w-0 items-center gap-2 border bg-transparent px-3',
              'transition-colors anim-ease-appear anim-duration-fast',
              'hover:border-stroke-active',
              'focus-within:border-stroke-active focus-within:bg-bg-highlight',
              searchInvalid && 'border-accent-error-highlight'
            )}
          >
            <SearchIcon className="size-4 shrink-0 text-fg-tertiary pointer-events-none" />
            <DebouncedInput
              id={searchId}
              placeholder="Search by name"
              value={globalFilter}
              onChange={handleSearchChange}
              debounce={200}
              aria-invalid={searchInvalid || undefined}
              className={cn(
                'prose-body min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none outline-none',
                'placeholder:text-fg-tertiary',
                'hover:bg-transparent focus:bg-transparent',
                'focus:[border-bottom:none] focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
            {searchInvalid ? (
              <span className="flex shrink-0 items-center">
                <TagFormatInvalidTooltip maxLength={TAG_SEARCH_MAX_LEN} />
              </span>
            ) : null}
          </label>
        </div>
        <AssignTagDialog templateId={templateId} templateName={templateName} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="prose-body text-fg-tertiary">
          Tags identify builds and can only be assigned to one build at once.{' '}
          <a
            href="https://e2b.dev/docs/template/tags"
            target="_blank"
            rel="noopener"
            className="underline-offset-2 underline hover:text-fg transition-colors"
          >
            Read&nbsp;more
          </a>
          .
        </p>
        {!hasSearch && (
          <p className="prose-body text-fg-tertiary whitespace-nowrap">
            {total} tags in total
          </p>
        )}
      </div>
    </div>
  )
}
