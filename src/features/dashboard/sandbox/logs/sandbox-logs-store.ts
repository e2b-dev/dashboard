'use client'

import type { SandboxLogDTO } from '@/server/api/models/sandboxes.models'
import type { useTRPCClient } from '@/trpc/client'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface SandboxLogsParams {
  teamIdOrSlug: string
  sandboxId: string
}

type TRPCClient = ReturnType<typeof useTRPCClient>

interface SandboxLogsState {
  logs: SandboxLogDTO[]
  hasMoreBackwards: boolean
  isLoadingBackwards: boolean
  isLoadingForwards: boolean
  backwardsCursor: number | null
  forwardCursor: number | null
  isInitialized: boolean
  hasCompletedInitialLoad: boolean
  initialLoadError: string | null

  _trpcClient: TRPCClient | null
  _params: SandboxLogsParams | null
  _initVersion: number
}

interface SandboxLogsMutations {
  init: (trpcClient: TRPCClient, params: SandboxLogsParams) => Promise<void>
  fetchMoreBackwards: () => Promise<void>
  fetchMoreForwards: () => Promise<{ logsCount: number }>
  reset: () => void
}

interface SandboxLogsComputed {
  getNewestTimestamp: () => number | undefined
  getOldestTimestamp: () => number | undefined
}

export type SandboxLogsStoreData = SandboxLogsState &
  SandboxLogsMutations &
  SandboxLogsComputed

const initialState: SandboxLogsState = {
  logs: [],
  hasMoreBackwards: true,
  isLoadingBackwards: false,
  isLoadingForwards: false,
  backwardsCursor: null,
  forwardCursor: null,
  isInitialized: false,
  hasCompletedInitialLoad: false,
  initialLoadError: null,
  _trpcClient: null,
  _params: null,
  _initVersion: 0,
}

export const createSandboxLogsStore = () =>
  create<SandboxLogsStoreData>()(
    immer((set, get) => ({
      ...initialState,

      reset: () => {
        set((state) => {
          state.logs = []
          state.hasMoreBackwards = true
          state.isLoadingBackwards = false
          state.isLoadingForwards = false
          state.backwardsCursor = null
          state.forwardCursor = null
          state.isInitialized = false
          state.hasCompletedInitialLoad = false
          state.initialLoadError = null
        })
      },

      init: async (trpcClient, params) => {
        const state = get()

        // reset if params changed
        const paramsChanged =
          state._params?.sandboxId !== params.sandboxId ||
          state._params?.teamIdOrSlug !== params.teamIdOrSlug

        if (paramsChanged || !state.isInitialized) {
          get().reset()
        }

        // increment version to invalidate any in-flight requests
        const requestVersion = state._initVersion + 1

        set((s) => {
          s._trpcClient = trpcClient
          s._params = params
          s.isLoadingBackwards = true
          s.initialLoadError = null
          s._initVersion = requestVersion
        })

        try {
          const initCursor = Date.now()

          const result = await trpcClient.sandbox.logsBackwards.query({
            teamIdOrSlug: params.teamIdOrSlug,
            sandboxId: params.sandboxId,
            cursor: initCursor,
          })

          // ignore stale response if a newer init was called
          if (get()._initVersion !== requestVersion) {
            return
          }

          set((s) => {
            s.logs = result.logs
            s.hasMoreBackwards = result.nextCursor !== null
            s.backwardsCursor = result.nextCursor
            s.forwardCursor = initCursor
            s.isLoadingBackwards = false
            s.isInitialized = true
            s.hasCompletedInitialLoad = true
            s.initialLoadError = null
          })
        } catch (error) {
          // ignore errors from stale requests
          if (get()._initVersion !== requestVersion) {
            return
          }

          set((s) => {
            s.isLoadingBackwards = false
            s.hasCompletedInitialLoad = true
            s.initialLoadError =
              error instanceof Error
                ? error.message
                : 'Failed to load sandbox logs.'
          })
        }
      },

      fetchMoreBackwards: async () => {
        const state = get()

        if (
          !state._trpcClient ||
          !state._params ||
          !state.hasMoreBackwards ||
          state.isLoadingBackwards
        ) {
          return
        }

        const requestVersion = state._initVersion

        set((s) => {
          s.isLoadingBackwards = true
        })

        try {
          const cursor =
            state.backwardsCursor ?? state.getOldestTimestamp() ?? Date.now()

          const result = await state._trpcClient.sandbox.logsBackwards.query({
            teamIdOrSlug: state._params.teamIdOrSlug,
            sandboxId: state._params.sandboxId,
            cursor,
          })

          // ignore stale response if init was called during fetch
          if (get()._initVersion !== requestVersion) {
            return
          }

          set((s) => {
            s.logs = [...result.logs, ...s.logs]
            s.hasMoreBackwards = result.nextCursor !== null
            s.backwardsCursor = result.nextCursor
            s.isLoadingBackwards = false
          })
        } catch {
          if (get()._initVersion !== requestVersion) {
            return
          }

          set((s) => {
            s.isLoadingBackwards = false
          })
        }
      },

      fetchMoreForwards: async () => {
        const state = get()

        if (!state._trpcClient || !state._params || state.isLoadingForwards) {
          return { logsCount: 0 }
        }

        const requestVersion = state._initVersion

        set((s) => {
          s.isLoadingForwards = true
        })

        try {
          const cursor = state.forwardCursor ?? Date.now()

          const result = await state._trpcClient.sandbox.logsForward.query({
            teamIdOrSlug: state._params.teamIdOrSlug,
            sandboxId: state._params.sandboxId,
            cursor,
          })

          // ignore stale response if init was called during fetch
          if (get()._initVersion !== requestVersion) {
            return { logsCount: 0 }
          }

          const logsCount = result.logs.length

          set((s) => {
            if (logsCount > 0) {
              s.logs = [...s.logs, ...result.logs]
            }
            s.forwardCursor = result.nextCursor ?? cursor
            s.isLoadingForwards = false
          })

          return { logsCount }
        } catch {
          if (get()._initVersion !== requestVersion) {
            return { logsCount: 0 }
          }

          set((s) => {
            s.isLoadingForwards = false
          })

          return { logsCount: 0 }
        }
      },

      getNewestTimestamp: () => {
        const state = get()
        return state.logs[state.logs.length - 1]?.timestampUnix
      },

      getOldestTimestamp: () => {
        const state = get()
        return state.logs[0]?.timestampUnix
      },
    }))
  )

export type SandboxLogsStore = ReturnType<typeof createSandboxLogsStore>
