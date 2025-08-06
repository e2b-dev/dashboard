import { useStore } from 'zustand'
import { useSandboxInspectContext } from '../context'

export function useLastUpdated() {
  const { store } = useSandboxInspectContext()

  return useStore(store, (state) => state.lastUpdated)
}

export function useWatcherError() {
  const { store } = useSandboxInspectContext()

  return useStore(store, (state) => state.watcherError)
}
