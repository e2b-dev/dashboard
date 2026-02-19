import { Template } from '@/types/api.types'
import { Badge } from '@/ui/primitives/badge'
import { Table } from '@tanstack/react-table'
import { Hexagon, ListFilter } from 'lucide-react'
import { Suspense } from 'react'
import TemplatesTableFilters from './table-filters'
import { SearchInput } from './table-search'

interface TemplatesHeaderProps {
  table: Table<Template>
}

export default function TemplatesHeader({ table }: TemplatesHeaderProps) {
  'use no memo'

  const showFilteredRowCount =
    Object.keys(table.getState().columnFilters).length > 0 ||
    table.getState().globalFilter

  const filteredCount = table.getFilteredRowModel().rows.length
  const totalCount = table.getCoreRowModel().rows.length

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className="shrink-0">
        <SearchInput />
      </div>

      <Suspense fallback={null}>
        <TemplatesTableFilters />
      </Suspense>

      {/* Extra spacing before count (margin would look bad when wrapped) */}
      <div className="w-2 shrink-0" aria-hidden="true" />

      <span className="prose-label-highlight uppercase h-9 flex items-center gap-1">
        {showFilteredRowCount ? (
          <>
            <span className="text-fg">
              {filteredCount} {filteredCount === 1 ? 'result' : 'results'}
            </span>
            <span className="text-fg-tertiary"> · </span>
            <span className="text-fg-tertiary">
              {totalCount} total
            </span>
          </>
        ) : (
          <span className="text-fg-tertiary">
            {totalCount} total
          </span>
        )}
      </span>
    </div>
  )
}
