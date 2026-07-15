import type { Table } from '@tanstack/react-table'
import { Suspense } from 'react'
import type { Template } from '@/core/modules/templates/models'
import { useTemplateTableStore } from './stores/table-store'
import TemplatesTableFilters from './table-filters'
import { SearchInput } from './table-search'

interface TemplatesHeaderProps {
  table: Table<Template>
  hasNextPage: boolean
}

export default function TemplatesHeader({
  table,
  hasNextPage,
}: TemplatesHeaderProps) {
  'use no memo'

  const { globalFilter, isPublic } = useTemplateTableStore()
  const isFiltered = Boolean(globalFilter) || isPublic !== undefined

  // With server-side pagination we only know how many rows are currently
  // loaded, not the grand total — so once all pages are loaded the count is
  // exact, otherwise "N+" marks it as a lower bound.
  const loadedCount = table.options.data.length

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-1 sm:items-center">
      <div className="w-full sm:w-auto sm:shrink-0">
        <SearchInput />
      </div>

      <Suspense fallback={null}>
        <TemplatesTableFilters className="w-full sm:w-auto" />
      </Suspense>

      {/* Extra spacing before count (margin would look bad when wrapped) */}
      <div className="hidden w-2 shrink-0 sm:block" aria-hidden="true" />

      <span className="prose-label-highlight h-9 flex w-full min-w-0 items-center gap-1 uppercase sm:w-auto">
        <span className="text-fg">
          {loadedCount}
          {hasNextPage ? '+' : ''}{' '}
          {loadedCount === 1 && !hasNextPage ? 'template' : 'templates'}
        </span>
        {isFiltered ? (
          <span className="text-fg-tertiary"> · filtered</span>
        ) : null}
      </span>
    </div>
  )
}
