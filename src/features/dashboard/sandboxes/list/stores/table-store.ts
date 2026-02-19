'use client'

import { areStringArraysEqual } from '@/lib/utils/array'
import { createHashStorage } from '@/lib/utils/store'
import type { OnChangeFn, SortingState } from '@tanstack/react-table'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { trackSandboxListInteraction } from '../tracking'

export const sandboxListPollingIntervals = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
]

type SandboxListPollingInterval =
  (typeof sandboxListPollingIntervals)[number]['value']

export type SandboxStartedAtFilter = '1h ago' | '6h ago' | '12h ago' | undefined

export const sandboxListDefaultSorting: SortingState = [
  { id: 'startedAt', desc: true },
]

type UpdaterInput<T> = T | ((state: T) => T)

const resolveUpdater = <T>(updater: UpdaterInput<T>, state: T): T =>
  typeof updater === 'function'
    ? (updater as (currentState: T) => T)(state)
    : updater

interface SandboxListTableState {
  // Page state
  pollingInterval: SandboxListPollingInterval

  // Table state
  sorting: SortingState
  globalFilter: string

  // Filter state
  startedAtFilter: SandboxStartedAtFilter
  templateFilters: string[]
  cpuCount: number | undefined
  memoryMB: number | undefined
}

interface SandboxListTableActions {
  // Table actions
  setSorting: OnChangeFn<SortingState>
  setGlobalFilter: OnChangeFn<string>

  // Filter actions
  setStartedAtFilter: (filter: SandboxStartedAtFilter) => void
  setTemplateFilters: (filters: string[]) => void
  setCpuCount: (count: number | undefined) => void
  setMemoryMB: (mb: number | undefined) => void
  resetFilters: () => void

  // Page actions
  setPollingInterval: (interval: SandboxListPollingInterval) => void
}

type SandboxListTableStore = SandboxListTableState & SandboxListTableActions

const initialState: SandboxListTableState = {
  // Page state
  pollingInterval: sandboxListPollingIntervals[2]!.value,

  // Table state
  sorting: sandboxListDefaultSorting,
  globalFilter: '',

  // Filter state
  startedAtFilter: undefined,
  templateFilters: [],
  cpuCount: undefined,
  memoryMB: undefined,
}

export const useSandboxListTableStore = create<SandboxListTableStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      // Table actions
      setSorting: (sortingUpdater) => {
        let didChangeSorting = false

        set((state) => {
          const nextSorting = resolveUpdater(sortingUpdater, state.sorting)

          if (nextSorting === state.sorting) {
            return state
          }

          didChangeSorting = true
          return { sorting: nextSorting }
        })

        if (!didChangeSorting) {
          return
        }

        trackSandboxListInteraction('sorted', {
          column_count: get().sorting.length,
        })
      },

      setGlobalFilter: (globalFilterUpdater) => {
        set((state) => {
          const newGlobalFilter =
            resolveUpdater(globalFilterUpdater, state.globalFilter)

          if (newGlobalFilter === state.globalFilter) {
            return state
          }

          trackSandboxListInteraction('searched', {
            has_query: Boolean(newGlobalFilter),
            query: newGlobalFilter,
          })

          return {
            globalFilter: newGlobalFilter,
          }
        })
      },

      // Filter actions
      setStartedAtFilter: (startedAtFilter) => {
        set((state) => {
          if (state.startedAtFilter === startedAtFilter) {
            return state
          }

          trackSandboxListInteraction('filtered', {
            type: 'started_at',
            value: startedAtFilter,
          })

          return { startedAtFilter }
        })
      },

      setTemplateFilters: (templateFilters) => {
        set((state) => {
          if (areStringArraysEqual(state.templateFilters, templateFilters)) {
            return state
          }

          trackSandboxListInteraction('filtered', {
            type: 'template',
            count: templateFilters.length,
          })

          return { templateFilters }
        })
      },

      setCpuCount: (cpuCount) => {
        set((state) => {
          if (state.cpuCount === cpuCount) {
            return state
          }

          trackSandboxListInteraction('filtered', {
            type: 'cpu',
            value: cpuCount,
          })

          return { cpuCount }
        })
      },

      setMemoryMB: (memoryMB) => {
        set((state) => {
          if (state.memoryMB === memoryMB) {
            return state
          }

          trackSandboxListInteraction('filtered', {
            type: 'memory',
            value: memoryMB,
          })

          return { memoryMB }
        })
      },

      resetFilters: () => {
        set((state) => {
          const hasFilterChanges =
            state.startedAtFilter !== initialState.startedAtFilter ||
            state.templateFilters.length > 0 ||
            state.cpuCount !== initialState.cpuCount ||
            state.memoryMB !== initialState.memoryMB ||
            state.globalFilter !== initialState.globalFilter

          if (!hasFilterChanges) {
            return state
          }

          trackSandboxListInteraction('reset filters')

          return {
            startedAtFilter: initialState.startedAtFilter,
            templateFilters: initialState.templateFilters,
            cpuCount: initialState.cpuCount,
            memoryMB: initialState.memoryMB,
            globalFilter: initialState.globalFilter,
          }
        })
      },

      // Page actions
      setPollingInterval: (pollingInterval) => {
        set((state) => {
          if (state.pollingInterval === pollingInterval) {
            return state
          }

          trackSandboxListInteraction('changed polling interval', {
            interval: pollingInterval,
          })

          return { pollingInterval }
        })
      },
    }),
    {
      name: 'state',
      storage: createJSONStorage(() =>
        createHashStorage<SandboxListTableState>(initialState)
      ),
    }
  )
)
