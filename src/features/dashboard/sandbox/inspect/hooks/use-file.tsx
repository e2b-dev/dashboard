'use client'

import { useMemo } from 'react'
import { useSandboxInspectContext } from '../context'
import { useStore } from 'zustand'

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

  return useMemo(
    () => ({
      refresh: () => operations.refreshFile(path),
      select: () => operations.selectNode(path),
    }),
    [operations, path]
  )
}

/**
 * Combined hook for file data and operations
 */
export function useFile(path: string) {
  const state = useFileState(path)
  const ops = useFileOperations(path)

  return {
    ...state,
    ...ops,
  }
}
