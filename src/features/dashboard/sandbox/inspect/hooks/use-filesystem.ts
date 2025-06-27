'use client'

import { useSandboxInspectContext } from '../context'
import type { FilesystemOperations } from '../filesystem/types'

/**
 * Main hook for accessing filesystem operations
 */
export function useFilesystem(): FilesystemOperations {
  const { operations } = useSandboxInspectContext()
  return operations
}
