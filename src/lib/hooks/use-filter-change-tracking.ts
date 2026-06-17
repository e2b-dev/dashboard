import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tracks when any value in `deps` changes after the first render and exposes a
 * `isFilterRefetching` flag that callers clear once their underlying fetch
 * settles. Use to drive a refetch overlay on tables that paginate via
 * server-side filters/sort.
 */
export function useFilterChangeTracking(deps: unknown[]) {
  const [isFilterRefetching, setIsFilterRefetching] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setIsFilterRefetching(true)
  }, deps)

  const clearFilterRefetching = useCallback(() => {
    setIsFilterRefetching(false)
  }, [])

  return { isFilterRefetching, clearFilterRefetching }
}
