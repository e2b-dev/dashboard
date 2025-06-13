import { useMemo } from 'react'
import { useFilesystemContext } from '../state/context'
import type { FilesystemNode } from '../state/types'

/**
 * Hook for accessing a specific filesystem node
 */
export function useFilesystemNode(path: string): FilesystemNode | undefined {
  const { store } = useFilesystemContext()

  return store((state) => state.getNode(path))
}

/**
 * Hook for accessing node selection state
 */
export function useNodeSelection(path: string) {
  const { store, operations } = useFilesystemContext()

  const isSelected = store((state) => state.isSelected(path))

  const select = useMemo(
    () => () => operations.selectNode(path),
    [operations, path]
  )

  return {
    isSelected,
    select,
  }
}

/**
 * Combined hook for node data and operations
 */
export function useNode(path: string) {
  const node = useFilesystemNode(path)
  const selection = useNodeSelection(path)

  return {
    node,
    ...selection,
  }
}

/**
 * Hook for getting root directory children (commonly used)
 */
export function useRootChildren() {
  const { store } = useFilesystemContext()

  return store((state) => state.getChildren(state.rootPath))
}

/**
 * Hook for getting selected node path
 */
export function useSelectedPath() {
  const { store } = useFilesystemContext()

  return store((state) => state.selectedPath)
}

/**
 * Hook for getting all loading paths
 */
export function useLoadingPaths() {
  const { store } = useFilesystemContext()

  return store((state) => Array.from(state.loadingPaths))
}

/**
 * Hook for getting all error paths and their messages
 */
export function useErrorPaths() {
  const { store } = useFilesystemContext()

  return store((state) => Object.fromEntries(state.errorPaths))
}
