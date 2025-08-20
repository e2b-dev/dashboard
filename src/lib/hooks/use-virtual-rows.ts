'use client'

import { Row } from '@tanstack/react-table'
import { useVirtualizer, Virtualizer } from '@tanstack/react-virtual'
import { RefObject, useMemo } from 'react'

interface UseVirtualRowsParams<TData> {
  rows: Row<TData>[]
  scrollRef: RefObject<HTMLElement | null>
  estimateSizePx: number
  overscan?: number
}

interface UseVirtualRowsResult<TData> {
  virtualRows: Row<TData>[]
  virtualizer: Virtualizer<HTMLElement, Element>
  totalHeight: number
  paddingTop: number
}

export function useVirtualRows<TData>({
  rows,
  scrollRef,
  estimateSizePx,
  overscan = 8,
}: UseVirtualRowsParams<TData>): UseVirtualRowsResult<TData> {
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current as HTMLElement | null,
    estimateSize: () => estimateSizePx,
    overscan,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalHeight = rowVirtualizer.getTotalSize()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0

  const virtualRows = useMemo(
    () => virtualItems.map((vi) => rows[vi.index]!).filter(Boolean),
    [virtualItems, rows]
  )

  return {
    virtualRows,
    virtualizer: rowVirtualizer,
    totalHeight,
    paddingTop,
  }
}
