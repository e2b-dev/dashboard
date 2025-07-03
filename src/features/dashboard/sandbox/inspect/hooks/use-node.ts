'use client'

import { useMemo } from 'react'
import { useSandboxInspectContext } from '../context'
import type { FilesystemNode } from '../filesystem/types'
import { useStore } from 'zustand'

/**
 * Hook for accessing a specific filesystem node
 */
export function useFilesystemNode(path: string): FilesystemNode | undefined {
  const { store } = useSandboxInspectContext()

  const node = useStore(store, (state) => state.getNode(path))

  return node
}

/**
 * Hook for accessing node selection state
 */
export function useNodeSelection(path: string) {
  const { store, operations } = useSandboxInspectContext()

  const isSelected = useStore(store, (state) => state.isSelected(path))

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
  const { store } = useSandboxInspectContext()

  return useStore(store, (state) => state.getChildren(state.rootPath))
}

/**
 * Hook for getting selected node path
 */
export function useSelectedPath() {
  const { store } = useSandboxInspectContext()

  return useStore(store, (state) => state.selectedPath)
}

/**
 * Hook for getting all loading paths
 */
export function useLoadingPaths() {
  const { store } = useSandboxInspectContext()

  return useStore(store, (state) => state.loadingPaths)
}

/**
 * Hook for getting all error paths and their messages
 */
export function useErrorPaths() {
  const { store } = useSandboxInspectContext()

  return useStore(store, (state) => state.errorPaths)
}
