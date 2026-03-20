'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { SandboxLogModel } from '@/core/modules/sandboxes/models'
import type { useTRPCClient } from '@/trpc/client'
import {
  countLeadingAtTimestamp,
  countTrailingAtTimestamp,
  dropLeadingAtTimestamp,
  dropTrailingAtTimestamp,
} from '../../common/log-timestamp-utils'
import type { LogLevelFilter } from './logs-filter-params'

interface SandboxLogsParams {
  teamIdOrSlug: string
  sandboxId: string
}

type TRPCClient = ReturnType<typeof useTRPCClient>

interface SandboxLogsState {
  logs: SandboxLogModel[]
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
  level: LogLevelFilter | null
  search: string

  _trpcClient: TRPCClient | null
  _params: SandboxLogsParams | null
  _initVersion: number
}

interface SandboxLogsMutations {
  init: (
    trpcClient: TRPCClient,
    params: SandboxLogsParams,
    level: LogLevelFilter | null,
    search: string
  ) => Promise<void>
  fetchMoreBackwards: () => Promise<void>
  fetchMoreForwards: () => Promise<{ logsCount: number }>
  reset: () => void
}

export type SandboxLogsStoreData = SandboxLogsState & SandboxLogsMutations
const EMPTY_INIT_FORWARD_LOOKBACK_MS = 5_000

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
  level: null,
  search: '',
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
          state.level = null
          state.search = ''
        })
      },

      init: async (trpcClient, params, level, search) => {
        const state = get()

        // reset if params changed
        const paramsChanged =
          state._params?.sandboxId !== params.sandboxId ||
          state._params?.teamIdOrSlug !== params.teamIdOrSlug
        const filterChanged = state.level !== level || state.search !== search

        if (paramsChanged || filterChanged || !state.isInitialized) {
          get().reset()
        }

        // increment version to invalidate any in-flight requests
        const requestVersion = state._initVersion + 1

        set((s) => {
          s._trpcClient = trpcClient
          s._params = params
          s.level = level
          s.search = search
          s.isLoadingBackwards = true
          s.initialLoadError = null
          s._initVersion = requestVersion
        })

        try {
          const initCursor = Date.now()

          const result = await trpcClient.sandbox.logsBackwardsReversed.query({
            teamIdOrSlug: params.teamIdOrSlug,
            sandboxId: params.sandboxId,
            cursor: initCursor,
            level: level ?? undefined,
            search: search || undefined,
          })

          // ignore stale response if a newer init was called
          if (get()._initVersion !== requestVersion) {
            return
          }

          set((s) => {
            const backwardsCursor = result.nextCursor
            const newestInitialTimestamp =
              result.logs[result.logs.length - 1]?.timestampUnix

            s.logs = result.logs
            s.hasMoreBackwards = backwardsCursor !== null
            s.backwardsCursor = backwardsCursor
            s.backwardsSeenAtCursor =
              backwardsCursor === null
                ? 0
                : countLeadingAtTimestamp(result.logs, backwardsCursor)
            if (newestInitialTimestamp !== undefined) {
              s.forwardCursor = newestInitialTimestamp
              s.forwardSeenAtCursor = countTrailingAtTimestamp(
                result.logs,
                newestInitialTimestamp
              )
            } else {
              // If the initial snapshot is empty, start slightly in the past so
              // delayed-ingestion logs around page load are not skipped.
              s.forwardCursor = initCursor - EMPTY_INIT_FORWARD_LOOKBACK_MS
              s.forwardSeenAtCursor = 0
            }
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

          const result =
            await state._trpcClient.sandbox.logsBackwardsReversed.query({
              teamIdOrSlug: state._params.teamIdOrSlug,
              sandboxId: state._params.sandboxId,
              cursor,
              level: state.level ?? undefined,
              search: state.search || undefined,
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
            const nextLogs =
              newLogs.length > 0 ? [...newLogs, ...s.logs] : s.logs
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
            level: state.level ?? undefined,
            search: state.search || undefined,
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

              const newestLog = newLogs[logsCount - 1]
              if (!newestLog) {
                s.isLoadingForwards = false
                return
              }
              const newestTimestamp = newestLog.timestampUnix
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
