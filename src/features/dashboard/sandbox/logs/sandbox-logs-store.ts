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
  backwardsSeenAtCursor: number
  forwardCursor: number | null
  forwardSeenAtCursor: number
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

export type SandboxLogsStoreData = SandboxLogsState & SandboxLogsMutations

function countLeadingAtTimestamp(logs: SandboxLogDTO[], timestamp: number) {
  let count = 0

  while (count < logs.length && logs[count]!.timestampUnix === timestamp) {
    count += 1
  }

  return count
}

function countTrailingAtTimestamp(logs: SandboxLogDTO[], timestamp: number) {
  let count = 0
  let index = logs.length - 1

  while (index >= 0 && logs[index]!.timestampUnix === timestamp) {
    count += 1
    index -= 1
  }

  return count
}

function dropLeadingAtTimestamp(
  logs: SandboxLogDTO[],
  timestamp: number,
  dropCount: number
) {
  if (dropCount <= 0) {
    return logs
  }

  let index = 0
  let remainingToDrop = dropCount

  while (
    index < logs.length &&
    remainingToDrop > 0 &&
    logs[index]!.timestampUnix === timestamp
  ) {
    index += 1
    remainingToDrop -= 1
  }

  return logs.slice(index)
}

function dropTrailingAtTimestamp(
  logs: SandboxLogDTO[],
  timestamp: number,
  dropCount: number
) {
  if (dropCount <= 0) {
    return logs
  }

  let end = logs.length
  let remainingToDrop = dropCount

  while (
    end > 0 &&
    remainingToDrop > 0 &&
    logs[end - 1]!.timestampUnix === timestamp
  ) {
    end -= 1
    remainingToDrop -= 1
  }

  return logs.slice(0, end)
}

const initialState: SandboxLogsState = {
  logs: [],
  hasMoreBackwards: true,
  isLoadingBackwards: false,
  isLoadingForwards: false,
  backwardsCursor: null,
  backwardsSeenAtCursor: 0,
  forwardCursor: null,
  forwardSeenAtCursor: 0,
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
          state.backwardsSeenAtCursor = 0
          state.forwardCursor = null
          state.forwardSeenAtCursor = 0
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
            const backwardsCursor = result.nextCursor

            s.logs = result.logs
            s.hasMoreBackwards = backwardsCursor !== null
            s.backwardsCursor = backwardsCursor
            s.backwardsSeenAtCursor =
              backwardsCursor === null
                ? 0
                : countLeadingAtTimestamp(result.logs, backwardsCursor)
            s.forwardCursor = initCursor
            // Initial backward snapshot can include logs exactly at initCursor.
            // Track how many were already consumed so first forward poll does not replay them.
            s.forwardSeenAtCursor = countTrailingAtTimestamp(result.logs, initCursor)
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
            state.backwardsCursor ?? state.logs[0]?.timestampUnix ?? Date.now()

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
            const newLogs = dropTrailingAtTimestamp(
              result.logs,
              cursor,
              state.backwardsSeenAtCursor
            )
            const nextLogs = newLogs.length > 0 ? [...newLogs, ...s.logs] : s.logs
            const backwardsCursor = result.nextCursor

            s.logs = nextLogs
            s.hasMoreBackwards = backwardsCursor !== null
            s.backwardsCursor = backwardsCursor
            s.backwardsSeenAtCursor =
              backwardsCursor === null
                ? 0
                : countLeadingAtTimestamp(nextLogs, backwardsCursor)
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
          const seenAtCursor = state.forwardSeenAtCursor

          const result = await state._trpcClient.sandbox.logsForward.query({
            teamIdOrSlug: state._params.teamIdOrSlug,
            sandboxId: state._params.sandboxId,
            cursor,
          })

          // ignore stale response if init was called during fetch
          if (get()._initVersion !== requestVersion) {
            return { logsCount: 0 }
          }

          const newLogs = dropLeadingAtTimestamp(
            result.logs,
            cursor,
            seenAtCursor
          )
          const logsCount = newLogs.length

          set((s) => {
            if (logsCount > 0) {
              s.logs = [...s.logs, ...newLogs]

              const newestTimestamp = newLogs[logsCount - 1]!.timestampUnix
              const trailingAtNewest = countTrailingAtTimestamp(
                newLogs,
                newestTimestamp
              )

              s.forwardCursor = newestTimestamp
              s.forwardSeenAtCursor =
                newestTimestamp === cursor
                  ? seenAtCursor + trailingAtNewest
                  : trailingAtNewest
            } else {
              s.forwardCursor = cursor
              s.forwardSeenAtCursor = seenAtCursor
            }
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
    }))
  )

export type SandboxLogsStore = ReturnType<typeof createSandboxLogsStore>
