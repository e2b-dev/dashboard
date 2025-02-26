import { Suspense } from 'react'
import TemplatesTableFilters from './table-filters'
import { SearchInput } from './table-search'
import { Badge } from '@/ui/primitives/badge'
import { Hexagon, ListFilter } from 'lucide-react'
import { Table } from '@tanstack/react-table'
import { Template } from '@/types/api'

interface TemplatesHeaderProps {
  table: Table<Template>
}

export default function TemplatesHeader({ table }: TemplatesHeaderProps) {
  'use no memo'

  const showFilteredRowCount =
    Object.keys(table.getState().columnFilters).length > 0 ||
    table.getState().globalFilter

  return (
    <div className="flex items-center justify-between gap-3 px-3">
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-4">
          <SearchInput />

          <div className="flex items-center gap-3">
            <Badge
              variant="success"
              className="h-min w-fit gap-2 font-bold uppercase"
            >
              {table.getCoreRowModel().rows.length} templates
              <Hexagon className="size-3 !stroke-[3px]" />
            </Badge>
            {showFilteredRowCount && (
              <Badge
                variant="contrast-1"
                className="h-min w-fit gap-2 font-bold uppercase"
              >
                {table.getFilteredRowModel().rows.length} filtered
                <ListFilter className="size-3 !stroke-[3px]" />
              </Badge>
            )}
          </div>
        </div>

        <Suspense fallback={null}>
          <TemplatesTableFilters />
        </Suspense>
      </div>
    </div>
  )
}
