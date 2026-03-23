import type { Table } from '@tanstack/react-table'
import { Suspense } from 'react'
import type { Template } from '@/types/api.types'
import TemplatesTableFilters from './table-filters'
import { SearchInput } from './table-search'

interface TemplatesHeaderProps {
  table: Table<Template>
}

export default function TemplatesHeader({ table }: TemplatesHeaderProps) {
  'use no memo'

  const { columnFilters, globalFilter } = table.getState()
  const showFilteredRowCount = columnFilters.length > 0 || Boolean(globalFilter)

  const totalCount = table.options.data.length
  const filteredCount = showFilteredRowCount
    ? table.getFilteredRowModel().rows.length
    : totalCount

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
        {showFilteredRowCount ? (
          <>
            <span className="text-fg">
              {filteredCount} {filteredCount === 1 ? 'result' : 'results'}
            </span>
            <span className="text-fg-tertiary"> · </span>
            <span className="text-fg-tertiary">{totalCount} total</span>
          </>
        ) : (
          <span className="text-fg-tertiary">{totalCount} total</span>
        )}
      </span>
    </div>
  )
}
