'use client'

import { create } from 'zustand'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'

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
    set({ metrics })
  },
}))
