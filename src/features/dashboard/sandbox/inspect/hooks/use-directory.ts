import { useMemo } from 'react'
import { useSandboxInspectContext } from '../state/context'
import { FileType } from 'e2b'
import { FilesystemNode } from '../state/types'

/**
 * Hook for accessing directory children with automatic updates
 */
export function useDirectoryChildren(path: string): FilesystemNode[] {
  const { store } = useSandboxInspectContext()

  return store((state) => state.getChildren(path))
}

/**
 * Hook for accessing directory state (expanded, loading, error)
 */
export function useDirectoryState(path: string) {
  const { store } = useSandboxInspectContext()

  return store((state) => {
    const node = state.getNode(path)
    return {
      isExpanded: state.isExpanded(path),
      isLoading: state.loadingPaths.has(path),
      hasError: state.errorPaths.has(path),
      error: state.errorPaths.get(path),
      isLoaded: node?.type === FileType.DIR ? !!node?.isLoaded : undefined,
      hasChildren: state.hasChildren(path),
    }
  })
}

/**
 * Hook for directory operations
 */
export function useDirectoryOperations(path: string) {
  const { operations } = useSandboxInspectContext()

  return useMemo(
    () => ({
      toggle: () => operations.toggleDirectory(path),
      load: () => operations.loadDirectory(path),
      refresh: () => operations.refreshDirectory(path),
      watch: () => operations.watchDirectory(path),
      unwatch: () => operations.unwatchDirectory(path),
    }),
    [operations, path]
  )
}

/**
 * Combined hook for directory data and operations
 */
export function useDirectory(path: string) {
  const children = useDirectoryChildren(path)
  const state = useDirectoryState(path)
  const ops = useDirectoryOperations(path)

  return {
    children,
    ...state,
    ...ops,
  }
}
