'use client'

import { useMemo } from 'react'
import { useSandboxInspectContext } from '../context'
import { useStore } from 'zustand'
import { useFilesystemNode, useSelectedPath } from './use-node'
import { FileType } from 'e2b'

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

  if (!node || node.type !== FileType.FILE) {
    throw new Error(`Node at path ${path} is not a file`)
  }

  return {
    ...node,
    ...state,
    ...ops,
  }
}
