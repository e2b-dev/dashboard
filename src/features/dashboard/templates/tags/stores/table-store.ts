import type {
  ExpandedState,
  OnChangeFn,
  SortingState,
} from '@tanstack/react-table'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createHashStorage } from '@/lib/utils/store'

interface TagTableState {
  sorting: SortingState
  globalFilter: string
  expanded: ExpandedState
}

interface TagTableActions {
  setSorting: OnChangeFn<SortingState>
  setGlobalFilter: OnChangeFn<string>
  setExpanded: OnChangeFn<ExpandedState>
  resetFilters: () => void
}

type Store = TagTableState & TagTableActions

const initialState: TagTableState = {
  sorting: [{ id: 'assignedAt', desc: true }],
  globalFilter: '',
  expanded: {},
}

export const useTagTableStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSorting: (sorting) => {
        const next =
          typeof sorting === 'function' ? sorting(get().sorting) : sorting
        set({ sorting: next })
      },

      setGlobalFilter: (globalFilter) => {
        const next =
          typeof globalFilter === 'function'
            ? globalFilter(get().globalFilter)
            : globalFilter
        set({ globalFilter: next })
      },

      setExpanded: (expanded) => {
        const next =
          typeof expanded === 'function' ? expanded(get().expanded) : expanded
        set({ expanded: next })
      },

      resetFilters: () => {
        set({ globalFilter: '', expanded: {} })
      },
    }),
    {
      name: 'tags-table',
      storage: createJSONStorage(() => createHashStorage(initialState)),
      partialize: ({ sorting, globalFilter }) => ({ sorting, globalFilter }),
    }
  )
)
