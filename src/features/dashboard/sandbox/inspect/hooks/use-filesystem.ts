'use client'

import { useSandboxInspectContext } from '../state/context'
import type { FilesystemOperations } from '../state/types'

/**
 * Main hook for accessing filesystem operations
 */
export function useFilesystem(): FilesystemOperations {
  const { operations } = useSandboxInspectContext()
  return operations
}
