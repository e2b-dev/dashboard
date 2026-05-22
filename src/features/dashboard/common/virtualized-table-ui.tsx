import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual'
import type { CSSProperties, ReactNode } from 'react'
import { Loader } from '@/ui/primitives/loader'
import { TableBody, TableCell, TableRow } from '@/ui/primitives/table'
import { TableEmptyRowBorder } from '@/ui/primitives/table-empty-row-border'

export const getVirtualizedRowStyle = (
  virtualRow: VirtualItem,
  height: number
): CSSProperties => ({
  display: 'flex',
  position: 'absolute',
  left: 0,
  transform: `translateY(${virtualRow.start}px)`,
  minWidth: '100%',
  height,
})

interface VirtualizedTableRowProps {
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
  height: number
  className?: string
  children: ReactNode
}

export const VirtualizedTableRow = ({
  virtualRow,
  virtualizer,
  height,
  className,
  children,
}: VirtualizedTableRowProps) => (
  <TableRow
    data-index={virtualRow.index}
    ref={(node) => virtualizer.measureElement(node)}
    className={className}
    style={getVirtualizedRowStyle(virtualRow, height)}
  >
    {children}
  </TableRow>
)

export const VirtualizedTableLoaderBody = () => (
  <TableBody className="grid">
    <TableRow className="flex min-w-full mt-2">
      <TableCell className="flex-1">
        <div className="h-[35svh] w-full flex justify-center items-center">
          <Loader variant="slash" size="lg" />
        </div>
      </TableCell>
    </TableRow>
  </TableBody>
)

interface VirtualizedTableEmptyStateProps {
  children: ReactNode
}

const EMPTY_STATE_ROWS = Array.from({ length: 3 })

export const VirtualizedTableEmptyState = ({
  children,
}: VirtualizedTableEmptyStateProps) => (
  <TableBody className="grid">
    <TableRow className="flex min-w-full">
      <TableCell className="flex-1 p-0">
        <div className="w-full gap-2 relative flex flex-col justify-center items-center">
          {EMPTY_STATE_ROWS.map((_, index) => (
            <div
              key={index}
              className="h-11 w-full border border-bg-highlight relative flex items-center gap-2 justify-center overflow-hidden"
            >
              <TableEmptyRowBorder className="absolute bottom-0 left-0 rotate-180 opacity-99" />
              <TableEmptyRowBorder className="absolute bottom-0 right-0 opacity-99" />
              {index === 1 ? (
                <div className="text-fg prose-body-highlight flex items-center justify-center gap-2 px-2 text-center whitespace-nowrap">
                  {children}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </TableCell>
    </TableRow>
  </TableBody>
)
