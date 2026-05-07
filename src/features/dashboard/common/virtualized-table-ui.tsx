import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual'
import type { CSSProperties, ReactNode } from 'react'
import { Loader } from '@/ui/primitives/loader'
import { TableBody, TableCell, TableRow } from '@/ui/primitives/table'

// Style for an absolutely-positioned virtualized row; e.g. translateY(120px) at 26px height
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
