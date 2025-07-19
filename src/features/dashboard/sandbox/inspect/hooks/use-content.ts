import { useStore } from 'zustand/react'
import { useSandboxInspectContext } from '../context'
import { useCallback } from 'react'

export function useContent(path: string) {
  const { store, operations } = useSandboxInspectContext()

  const contentState = useStore(store, (state) => state.getFileContent(path))

  const refresh = useCallback(async () => {
    await operations.refreshFile(path)
  }, [path, operations])

  return {
    state: contentState,
    refresh,
  }
}
