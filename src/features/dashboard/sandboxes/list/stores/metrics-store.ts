'use client'

import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { create } from 'zustand'

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
    // we want to merge the new metrics with the existing ones, to keep latest data points in memory, as long as they are shown as running ( in local state )
    set((state) => ({ metrics: { ...state.metrics, ...metrics } }))
  },
}))
