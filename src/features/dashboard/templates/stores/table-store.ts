import { createHashStorage } from '@/lib/utils/store'
import { OnChangeFn, SortingState } from '@tanstack/react-table'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { trackTemplateTableInteraction } from '../table-config'

interface TemplateTableState {
  // Table state
  sorting: SortingState
  globalFilter: string
  // Filter state
  cpuCount?: number
  memoryMB?: number
  isPublic?: boolean
  createdAfter?: Date
  createdBefore?: Date
}

interface TemplateTableActions {
  // Table actions
  setSorting: OnChangeFn<SortingState>
  setGlobalFilter: OnChangeFn<string>
  // Filter actions
  setCpuCount: (value?: number) => void
  setMemoryMB: (value?: number) => void
  setIsPublic: (value?: boolean) => void
  setCreatedAfter: (value?: Date) => void
  setCreatedBefore: (value?: Date) => void
  resetFilters: () => void
}

type Store = TemplateTableState & TemplateTableActions

const initialState: TemplateTableState = {
  // Table state
  sorting: [],
  globalFilter: '',
  // Filter state
  cpuCount: undefined,
  memoryMB: undefined,
  isPublic: undefined,
  createdAfter: undefined,
  createdBefore: undefined,
}

export const useTemplateTableStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Table actions
      setSorting: (sorting) => {
        set((state) => ({
          sorting:
            typeof sorting === 'function' ? sorting(state.sorting) : sorting,
        }))
        trackTemplateTableInteraction('sorted', {
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
            trackTemplateTableInteraction('searched', {
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
      setCpuCount: (value) => {
        set((state) => ({ cpuCount: value }))
        trackTemplateTableInteraction('filtered', {
          type: 'cpu',
          value: value,
        })
      },
      setMemoryMB: (value) => {
        set((state) => ({ memoryMB: value }))
        trackTemplateTableInteraction('filtered', {
          type: 'memory',
          value: value,
        })
      },
      setIsPublic: (value) => {
        set((state) => ({ isPublic: value }))
        trackTemplateTableInteraction('filtered', {
          type: 'public',
          value: value,
        })
      },
      setCreatedAfter: (value) => {
        set((state) => ({ createdAfter: value }))
        trackTemplateTableInteraction('filtered', {
          type: 'created_after',
          value: value,
        })
      },
      setCreatedBefore: (value) => {
        set((state) => ({ createdBefore: value }))
        trackTemplateTableInteraction('filtered', {
          type: 'created_before',
          value: value,
        })
      },

      resetFilters: () => {
        set({
          cpuCount: initialState.cpuCount,
          memoryMB: initialState.memoryMB,
          isPublic: initialState.isPublic,
          createdAfter: initialState.createdAfter,
          createdBefore: initialState.createdBefore,
          globalFilter: initialState.globalFilter,
        })
        trackTemplateTableInteraction('reset filters')
      },
    }),
    {
      name: 'state',
      storage: createJSONStorage(() => createHashStorage(initialState)),
    }
  )
)
