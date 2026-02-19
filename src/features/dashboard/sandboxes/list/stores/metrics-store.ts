'use client'

import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { create } from 'zustand'

// maximum number of sandbox metrics to keep in memory
// this is to prevent the store from growing too large and causing performance issues
const MAX_METRICS_ENTRIES = 500

interface SandboxMetricsState {
  metrics: ClientSandboxesMetrics
}

interface SandboxMetricsActions {
  setMetrics: (metrics: ClientSandboxesMetrics) => void
}

type Store = SandboxMetricsState & SandboxMetricsActions

const initialState: SandboxMetricsState = {
  metrics: {},
}

export const useSandboxMetricsStore = create<Store>()((set) => ({
  ...initialState,
  setMetrics: (metrics) => {
    set((state) => {
      const mergedMetrics = { ...state.metrics, ...metrics }
      const entries = Object.entries(mergedMetrics)

      // if we're under the cap, just return the merged metrics
      if (entries.length <= MAX_METRICS_ENTRIES) {
        return { metrics: mergedMetrics }
      }

      // sort entries by timestamp (oldest first)
      entries.sort((a, b) => {
        const timestampA = new Date(a[1].timestamp).getTime()
        const timestampB = new Date(b[1].timestamp).getTime()
        return timestampA - timestampB
      })

      // remove oldest entries to make room for new ones
      const entriesToRemove = entries.length - MAX_METRICS_ENTRIES
      const keptEntries = entries.slice(entriesToRemove)

      // convert back to object
      const cappedMetrics = Object.fromEntries(keptEntries)

      return { metrics: cappedMetrics }
    })
  },
}))
