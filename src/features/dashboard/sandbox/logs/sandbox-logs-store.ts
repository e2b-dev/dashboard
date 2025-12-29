'use client'

import type { SandboxLogDTO } from '@/server/api/models/sandboxes.models'
import type { useTRPCClient } from '@/trpc/client'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const FORWARD_CURSOR_PADDING_MS = 1

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
  isInitialized: boolean

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

function getLogKey(log: SandboxLogDTO): string {
  return `${log.timestampUnix}:${log.level}:${log.message}`
}

function deduplicateLogs(
  existingLogs: SandboxLogDTO[],
  newLogs: SandboxLogDTO[]
): SandboxLogDTO[] {
  const existingKeys = new Set(existingLogs.map(getLogKey))
  return newLogs.filter((log) => !existingKeys.has(getLogKey(log)))
}

const initialState: SandboxLogsState = {
  logs: [],
  hasMoreBackwards: true,
  isLoadingBackwards: false,
  isLoadingForwards: false,
  backwardsCursor: null,
  isInitialized: false,
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
          state.isInitialized = false
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
          s._initVersion = requestVersion
        })

        try {
          const result = await trpcClient.sandbox.logsBackwards.query({
            teamIdOrSlug: params.teamIdOrSlug,
            sandboxId: params.sandboxId,
            cursor: Date.now(),
          })

          // ignore stale response if a newer init was called
          if (get()._initVersion !== requestVersion) {
            return
          }

          set((s) => {
            s.logs = result.logs
            s.hasMoreBackwards = result.nextCursor !== null
            s.backwardsCursor = result.nextCursor
            s.isLoadingBackwards = false
            s.isInitialized = true
          })
        } catch {
          // ignore errors from stale requests
          if (get()._initVersion !== requestVersion) {
            return
          }

          set((s) => {
            s.isLoadingBackwards = false
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
            const uniqueNewLogs = deduplicateLogs(s.logs, result.logs)
            s.logs = [...uniqueNewLogs, ...s.logs]
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
          const newestTimestamp = state.getNewestTimestamp()
          const cursor = newestTimestamp
            ? newestTimestamp + FORWARD_CURSOR_PADDING_MS
            : Date.now()

          const result = await state._trpcClient.sandbox.logsForward.query({
            teamIdOrSlug: state._params.teamIdOrSlug,
            sandboxId: state._params.sandboxId,
            cursor,
          })

          // ignore stale response if init was called during fetch
          if (get()._initVersion !== requestVersion) {
            return { logsCount: 0 }
          }

          let uniqueLogsCount = 0

          set((s) => {
            const uniqueNewLogs = deduplicateLogs(s.logs, result.logs)
            uniqueLogsCount = uniqueNewLogs.length
            if (uniqueLogsCount > 0) {
              s.logs = [...s.logs, ...uniqueNewLogs]
            }
            s.isLoadingForwards = false
          })

          return { logsCount: uniqueLogsCount }
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
