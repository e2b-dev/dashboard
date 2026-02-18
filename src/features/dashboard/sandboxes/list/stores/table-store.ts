'use client'

import { createHashStorage } from '@/lib/utils/store'
import { OnChangeFn, SortingState } from '@tanstack/react-table'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { trackTableInteraction } from '../table-config'
import { StartedAtFilter } from '../table-filters'

export const sandboxesPollingIntervals = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
]

type SandboxesPollingInterval =
  (typeof sandboxesPollingIntervals)[number]['value']

interface SandboxTableState {
  // Page state
  pollingInterval: SandboxesPollingInterval

  // Table state
  sorting: SortingState
  globalFilter: string

  // Filter state
  startedAtFilter: StartedAtFilter
  templateFilters: string[]
  cpuCount: number | undefined
  memoryMB: number | undefined
}

interface SandboxTableActions {
  // Table actions
  setSorting: OnChangeFn<SortingState>
  setGlobalFilter: OnChangeFn<string>

  // Filter actions
  setStartedAtFilter: (filter: StartedAtFilter) => void
  setTemplateFilters: (filters: string[]) => void
  setCpuCount: (count: number | undefined) => void
  setMemoryMB: (mb: number | undefined) => void
  resetFilters: () => void

  // Page actions
  setPollingInterval: (interval: SandboxesPollingInterval) => void
}

type Store = SandboxTableState & SandboxTableActions

const initialState: SandboxTableState = {
  // Page state
  pollingInterval: sandboxesPollingIntervals[2]!.value,

  // Table state
  sorting: [{ id: 'startedAt', desc: true }],
  globalFilter: '',

  // Filter state
  startedAtFilter: undefined,
  templateFilters: [],
  cpuCount: undefined,
  memoryMB: undefined,
}

export const useSandboxTableStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,
      // Table actions
      setSorting: (sorting) => {
        set((state) => ({
          ...state,
          sorting:
            typeof sorting === 'function' ? sorting(state.sorting) : sorting,
        }))
        trackTableInteraction('sorted', {
          column_count: (typeof sorting === 'function'
            ? sorting(get().sorting)
            : sorting
          ).length,
        })
      },

      setGlobalFilter: (globalFilter) => {
        set((state) => {
          const newGlobalFilter =
            typeof globalFilter === 'function'
              ? globalFilter(state.globalFilter)
              : globalFilter

          if (newGlobalFilter !== state.globalFilter) {
            trackTableInteraction('searched', {
              has_query: Boolean(newGlobalFilter),
              query: newGlobalFilter,
            })
          }

          return {
            ...state,
            globalFilter: newGlobalFilter,
          }
        })
      },

      // Filter actions
      setStartedAtFilter: (startedAtFilter) => {
        set({ startedAtFilter })
        trackTableInteraction('filtered', {
          type: 'started_at',
          value: startedAtFilter,
        })
      },

      setTemplateFilters: (templateFilters) => {
        set({ templateFilters })
        trackTableInteraction('filtered', {
          type: 'template',
          count: templateFilters.length,
        })
      },

      setCpuCount: (cpuCount) => {
        set({ cpuCount })
        trackTableInteraction('filtered', {
          type: 'cpu',
          value: cpuCount,
        })
      },

      setMemoryMB: (memoryMB) => {
        set({ memoryMB })
        trackTableInteraction('filtered', {
          type: 'memory',
          value: memoryMB,
        })
      },

      resetFilters: () => {
        set({
          startedAtFilter: initialState.startedAtFilter,
          templateFilters: initialState.templateFilters,
          cpuCount: initialState.cpuCount,
          memoryMB: initialState.memoryMB,
          globalFilter: initialState.globalFilter,
        })
        trackTableInteraction('reset filters')
      },

      // Page actions
      setPollingInterval: (pollingInterval) => {
        set({ pollingInterval })
        trackTableInteraction('changed polling interval', {
          interval: pollingInterval,
        })
      },
    }),
    {
      name: 'state',
      storage: createJSONStorage(() =>
        createHashStorage<SandboxTableState>(initialState)
      ),
    }
  )
)
