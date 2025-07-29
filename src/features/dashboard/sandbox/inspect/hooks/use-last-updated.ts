import { useSandboxInspectContext } from "../context"
import { useStore } from "zustand"

export function useLastUpdated() {
  const { store } = useSandboxInspectContext()

  return useStore(store, (state) => state.lastUpdated)
}