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
    <TableRow className="mt-2 flex min-w-full">
      <TableCell className="flex-1">
        <div className="flex h-[35svh] w-full items-center justify-center">
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
        <div className="relative flex w-full flex-col items-center justify-center gap-2">
          {EMPTY_STATE_ROWS.map((_, index) => (
            <div
              key={index}
              className="relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden border border-bg-highlight"
            >
              <TableEmptyRowBorder className="absolute bottom-0 left-0 rotate-180 opacity-99" />
              <TableEmptyRowBorder className="absolute bottom-0 right-0 opacity-99" />
              {index === 1 ? (
                <div className="prose-body-highlight flex items-center justify-center gap-2 whitespace-nowrap px-2 text-center text-fg">
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
