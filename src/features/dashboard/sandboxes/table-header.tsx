import { cn } from '@/lib/utils'
import {
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/ui/data-table'
import Scanline from '@/ui/scanline'
import { flexRender, HeaderGroup, Row, TableState } from '@tanstack/react-table'
import { SandboxWithMetrics } from './table-config'

interface TableHeaderProps {
  topRows: Row<SandboxWithMetrics>[]
  headerGroups: HeaderGroup<SandboxWithMetrics>[]
  state: TableState
}

const TableHeader = ({ topRows, headerGroups, state }: TableHeaderProps) => (
  <DataTableHeader
    className={cn(
      'sticky top-0 z-10 bg-bg shadow-xs',
      topRows?.length > 0 && 'mb-3'
    )}
  >
    {headerGroups.map((headerGroup) => (
      <DataTableRow key={headerGroup.id} className="border-b-0">
        {headerGroup.headers.map((header) => (
          <DataTableHead
            key={header.id}
            header={header}
            style={{
              width: header.getSize(),
            }}
            sorting={state.sorting.find((s) => s.id === header.id)?.desc}
          >
            <span className="overflow-x-hidden whitespace-nowrap">
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
            </span>
          </DataTableHead>
        ))}
      </DataTableRow>
    ))}
    <div className="relative">
      <Scanline className="bg-bg -z-10" />
      {topRows?.length > 0 &&
        topRows?.map((row, index: number) => (
          <DataTableRow
            key={row.id}
            className={cn(
              'odd:bg-transparent even:bg-transparent hover:bg-transparent',
              index === 0 && 'border-t'
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <DataTableCell cell={cell} key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </DataTableCell>
            ))}
          </DataTableRow>
        ))}
    </div>
  </DataTableHeader>
)

export default TableHeader
