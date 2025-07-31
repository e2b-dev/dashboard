'use client'

import { useMemo } from 'react'
import { useStore } from 'zustand'
import { useSandboxInspectContext } from '../context'
import { useFilesystemNode, useSelectedPath } from './use-node'

/**
 * Hook for accessing file state (loading, error)
 */
export function useFileState(path: string) {
  const { store } = useSandboxInspectContext()

  const isLoading = useStore(store, (state) => state.loadingPaths.has(path))
  const hasError = useStore(store, (state) => state.errorPaths.has(path))
  const error = useStore(store, (state) => state.errorPaths.get(path))
  const isSelected = useStore(store, (state) => state.isSelected(path))

  return useMemo(
    () => ({
      isLoading,
      hasError,
      error,
      isSelected,
    }),
    [isLoading, hasError, error, isSelected]
  )
}

/**
 * Hook for file operations
 */
export function useFileOperations(path: string) {
  const { operations } = useSandboxInspectContext()
  const selectedPath = useSelectedPath()

  return useMemo(
    () => ({
      refresh: () => operations.refreshFile(path),
      toggle: () => {
        if (selectedPath === path) {
          operations.resetSelected()
        } else {
          operations.selectNode(path)
        }
      },
      download: () => operations.downloadFile(path),
    }),
    [operations, path, selectedPath]
  )
}

/**
 * Combined hook for file data and operations
 */
export function useFile(path: string) {
  const node = useFilesystemNode(path)
  const state = useFileState(path)
  const ops = useFileOperations(path)

  return {
    ...(node && {
      name: node.name,
      type: node.type,
      path: node.path,
    }),
    ...state,
    ...ops,
  }
}
