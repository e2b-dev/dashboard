import { Table } from '@tanstack/react-table'
import { useEffect, useRef } from 'react'

/**
 * Hook to gather all column sizes once and store them as CSS variables.
 * Note: header.id values cannot contain spaces as they are used in CSS variable names.
 *
 * This optimized version reduces re-renders during column resizing by using a ref
 * to track the previous sizing state and only updating when necessary.
 */
export function useColumnSizeVars<T extends object>(table: Table<T>) {
  const prevSizingRef = useRef<string>('')
  const colSizesRef = useRef<{ [key: string]: string }>({})

  // Get the current sizing state as a string for comparison
  const currentSizing = JSON.stringify(table.getState().columnSizing)

  // Only recalculate when sizing actually changes
  useEffect(() => {
    if (prevSizingRef.current !== currentSizing) {
      const headers = table.getFlatHeaders()
      const newColSizes: { [key: string]: string } = {}

      headers.forEach((header) => {
        const sizePx = `${header.getSize()}px`
        newColSizes[`--header-${header.id}-size`] = sizePx
        newColSizes[`--col-${header.column.id}-size`] = sizePx
      })

      colSizesRef.current = newColSizes
      prevSizingRef.current = currentSizing
    }
  }, [table, currentSizing])

  return colSizesRef.current
}
