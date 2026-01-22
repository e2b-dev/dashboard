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

  return (
    <div className="flex items-center gap-1">
      <SearchInput />

      <Suspense fallback={null}>
        <TemplatesTableFilters />
      </Suspense>

      <Badge size="xl" variant="positive" className="uppercase">
        {table.getCoreRowModel().rows.length} templates
        <Hexagon className="size-3 !stroke-[3px]" />
      </Badge>
      {showFilteredRowCount && (
        <Badge size="xl" variant="info" className="uppercase">
          {table.getFilteredRowModel().rows.length} filtered
          <ListFilter className="size-3 !stroke-[3px]" />
        </Badge>
      )}
    </div>
  )
}
