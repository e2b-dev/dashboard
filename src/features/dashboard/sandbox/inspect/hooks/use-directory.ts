'use client'

import { useMemo } from 'react'
import { useSandboxInspectContext } from '../context'
import { FilesystemNode } from '../filesystem/types'
import { useStore } from 'zustand'

/**
 * Hook for accessing directory children with automatic updates
 */
export function useDirectoryChildren(path: string): FilesystemNode[] {
  const { store } = useSandboxInspectContext()

  return useStore(store, (state) => state.getChildren(path))
}

/**
 * Hook for accessing directory state (expanded, loading, error)
 */
export function useDirectoryState(path: string) {
  const { store } = useSandboxInspectContext()

  const isExpanded = useStore(store, (state) => state.isExpanded(path))
  const isLoading = useStore(store, (state) => state.loadingPaths.has(path))
  const hasError = useStore(store, (state) => state.errorPaths.has(path))
  const error = useStore(store, (state) => state.errorPaths.get(path))
  const isLoaded = useStore(store, (state) => state.isLoaded(path))
  const hasChildren = useStore(store, (state) => state.hasChildren(path))

  return useMemo(
    () => ({
      isExpanded,
      isLoading,
      hasError,
      error,
      isLoaded,
      hasChildren,
    }),
    [isExpanded, isLoading, hasError, error, isLoaded, hasChildren]
  )
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
