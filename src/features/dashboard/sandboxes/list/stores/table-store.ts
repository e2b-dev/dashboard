'use client'

import type { OnChangeFn, SortingState } from '@tanstack/react-table'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { SandboxState } from '@/core/modules/sandboxes/models'
import { areStringArraysEqual } from '@/lib/utils/array'
import { createHashStorage } from '@/lib/utils/store'
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

export const sandboxListDefaultStatusFilters: SandboxState[] = [
  'running',
  'paused',
]

export const isStatusFilterActive = (statusFilters: SandboxState[]) =>
  statusFilters.length === 1

export const sandboxListDefaultSorting: SortingState = [
  { id: 'startedAt', desc: true },
]

export const getSandboxListEffectiveSorting = (
  sorting: SortingState
): SortingState => (sorting.length > 0 ? sorting : sandboxListDefaultSorting)

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
  statusFilters: SandboxState[]
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
  toggleStatusFilter: (state: SandboxState) => void
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
  statusFilters: sandboxListDefaultStatusFilters,
}

export const useSandboxListTableStore = create<SandboxListTableStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      // Table actions
      setSorting: (sortingUpdater) => {
        let didChangeSorting = false

        set((state) => {
          const nextSorting = resolveUpdater(
            sortingUpdater,
            getSandboxListEffectiveSorting(state.sorting)
          )

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
        let didChangeGlobalFilter = false
        let nextGlobalFilter = ''

        set((state) => {
          const resolvedGlobalFilter = resolveUpdater(
            globalFilterUpdater,
            state.globalFilter
          )

          if (resolvedGlobalFilter === state.globalFilter) {
            return state
          }

          didChangeGlobalFilter = true
          nextGlobalFilter = resolvedGlobalFilter

          return {
            globalFilter: resolvedGlobalFilter,
          }
        })

        if (!didChangeGlobalFilter) {
          return
        }

        trackSandboxListInteraction('searched', {
          has_query: Boolean(nextGlobalFilter),
          query: nextGlobalFilter,
        })
      },

      // Filter actions
      setStartedAtFilter: (startedAtFilter) => {
        let didChangeStartedAtFilter = false

        set((state) => {
          if (state.startedAtFilter === startedAtFilter) {
            return state
          }

          didChangeStartedAtFilter = true

          return { startedAtFilter }
        })

        if (!didChangeStartedAtFilter) {
          return
        }

        trackSandboxListInteraction('filtered', {
          type: 'started_at',
          value: startedAtFilter,
        })
      },

      setTemplateFilters: (templateFilters) => {
        let didChangeTemplateFilters = false

        set((state) => {
          if (areStringArraysEqual(state.templateFilters, templateFilters)) {
            return state
          }

          didChangeTemplateFilters = true

          return { templateFilters }
        })

        if (!didChangeTemplateFilters) {
          return
        }

        trackSandboxListInteraction('filtered', {
          type: 'template',
          count: templateFilters.length,
        })
      },

      setCpuCount: (cpuCount) => {
        let didChangeCpuCount = false

        set((state) => {
          if (state.cpuCount === cpuCount) {
            return state
          }

          didChangeCpuCount = true

          return { cpuCount }
        })

        if (!didChangeCpuCount) {
          return
        }

        trackSandboxListInteraction('filtered', {
          type: 'cpu',
          value: cpuCount,
        })
      },

      setMemoryMB: (memoryMB) => {
        let didChangeMemoryMB = false

        set((state) => {
          if (state.memoryMB === memoryMB) {
            return state
          }

          didChangeMemoryMB = true

          return { memoryMB }
        })

        if (!didChangeMemoryMB) {
          return
        }

        trackSandboxListInteraction('filtered', {
          type: 'memory',
          value: memoryMB,
        })
      },

      toggleStatusFilter: (statusToToggle) => {
        let nextStatusFilters: SandboxState[] | null = null

        set((state) => {
          const isSelected = state.statusFilters.includes(statusToToggle)

          // Keep at least one state selected — deselecting the last one
          // would make the list always empty.
          if (isSelected && state.statusFilters.length === 1) {
            return state
          }

          // Rebuild from the defaults to keep a canonical order, so the
          // resulting query key is stable regardless of toggle order.
          const statusFilters = isSelected
            ? state.statusFilters.filter((s) => s !== statusToToggle)
            : sandboxListDefaultStatusFilters.filter(
                (s) => state.statusFilters.includes(s) || s === statusToToggle
              )

          nextStatusFilters = statusFilters

          return { statusFilters }
        })

        if (!nextStatusFilters) {
          return
        }

        trackSandboxListInteraction('filtered', {
          type: 'status',
          value: (nextStatusFilters as SandboxState[]).join(','),
        })
      },

      resetFilters: () => {
        let didResetFilters = false

        set((state) => {
          const hasFilterChanges =
            state.startedAtFilter !== initialState.startedAtFilter ||
            state.templateFilters.length > 0 ||
            state.cpuCount !== initialState.cpuCount ||
            state.memoryMB !== initialState.memoryMB ||
            state.globalFilter !== initialState.globalFilter ||
            isStatusFilterActive(state.statusFilters)

          if (!hasFilterChanges) {
            return state
          }

          didResetFilters = true

          return {
            startedAtFilter: initialState.startedAtFilter,
            templateFilters: initialState.templateFilters,
            cpuCount: initialState.cpuCount,
            memoryMB: initialState.memoryMB,
            globalFilter: initialState.globalFilter,
            statusFilters: initialState.statusFilters,
          }
        })

        if (!didResetFilters) {
          return
        }

        trackSandboxListInteraction('reset filters')
      },

      // Page actions
      setPollingInterval: (pollingInterval) => {
        let didChangePollingInterval = false

        set((state) => {
          if (state.pollingInterval === pollingInterval) {
            return state
          }

          didChangePollingInterval = true

          return { pollingInterval }
        })

        if (!didChangePollingInterval) {
          return
        }

        trackSandboxListInteraction('changed polling interval', {
          interval: pollingInterval,
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
