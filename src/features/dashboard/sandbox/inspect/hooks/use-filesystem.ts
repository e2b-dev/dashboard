import { useFilesystemContext } from '../state/context'
import type { FilesystemOperations } from '../state/types'

/**
 * Main hook for accessing filesystem operations
 */
export function useFilesystem(): FilesystemOperations {
  const { operations } = useFilesystemContext()
  return operations
}

/**
 * Hook for accessing the raw Zustand store
 * Use this when you need access to the full store API
 */
export function useFilesystemStore() {
  const { store } = useFilesystemContext()
  return store
}

/**
 * Hook for accessing the event manager
 * Use this for advanced operations like custom watch handling
 */
export function useFilesystemEventManager() {
  const { eventManager } = useFilesystemContext()
  return eventManager
}

/**
 * Hook for accessing the sandbox connection
 */
export function useFilesystemSandbox() {
  const { sandbox } = useFilesystemContext()
  return sandbox
}
