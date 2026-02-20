'use client'

import type { BuildLogDTO } from '@/server/api/models/builds.models'
import type { useTRPCClient } from '@/trpc/client'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  countLeadingAtTimestamp,
  countTrailingAtTimestamp,
  dropLeadingAtTimestamp,
  dropTrailingAtTimestamp,
} from '../common/log-timestamp-utils'
import type { LogLevelFilter } from './logs-filter-params'

const EMPTY_INIT_FORWARD_LOOKBACK_MS = 5_000

interface BuildLogsParams {
  teamIdOrSlug: string
  templateId: string
  buildId: string
}

type TRPCClient = ReturnType<typeof useTRPCClient>

interface BuildLogsState {
  logs: BuildLogDTO[]
  hasMoreBackwards: boolean
  isLoadingBackwards: boolean
  isLoadingForwards: boolean
  backwardsCursor: number | null
  backwardsSeenAtCursor: number
  forwardCursor: number | null
  forwardSeenAtCursor: number
  level: LogLevelFilter | null
  isInitialized: boolean

  _trpcClient: TRPCClient | null
  _params: BuildLogsParams | null
  _initVersion: number
}

interface BuildLogsMutations {
  init: (
    trpcClient: TRPCClient,
    params: BuildLogsParams,
    level: LogLevelFilter | null
  ) => Promise<void>
  fetchMoreBackwards: () => Promise<void>
  fetchMoreForwards: () => Promise<{ logsCount: number }>
  reset: () => void
}

export type BuildLogsStoreData = BuildLogsState & BuildLogsMutations

const initialState: BuildLogsState = {
  logs: [],
  hasMoreBackwards: true,
  isLoadingBackwards: false,
  isLoadingForwards: false,
  backwardsCursor: null,
  backwardsSeenAtCursor: 0,
  forwardCursor: null,
  forwardSeenAtCursor: 0,
  level: null,
  isInitialized: false,
  _trpcClient: null,
  _params: null,
  _initVersion: 0,
}

export const createBuildLogsStore = () =>
  create<BuildLogsStoreData>()(
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
          state.level = null
          state.isInitialized = false
        })
      },

      init: async (trpcClient, params, level) => {
        const state = get()

        // Reset if params or level changed
        const paramsChanged =
          state._params?.buildId !== params.buildId ||
          state._params?.templateId !== params.templateId ||
          state._params?.teamIdOrSlug !== params.teamIdOrSlug
        const levelChanged = state.level !== level

        if (paramsChanged || levelChanged || !state.isInitialized) {
          get().reset()
        }

        // Increment version to invalidate any in-flight requests
        const requestVersion = state._initVersion + 1

        set((s) => {
          s._trpcClient = trpcClient
          s._params = params
          s.level = level
          s.isLoadingBackwards = true
          s._initVersion = requestVersion
        })

        try {
          const initCursor = Date.now()

          const result =
            await trpcClient.builds.buildLogsBackwardsReversed.query({
              teamIdOrSlug: params.teamIdOrSlug,
              templateId: params.templateId,
              buildId: params.buildId,
              level: level ?? undefined,
              cursor: initCursor,
            })

          // Ignore stale response if a newer init was called
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
              s.forwardCursor = initCursor - EMPTY_INIT_FORWARD_LOOKBACK_MS
              s.forwardSeenAtCursor = 0
            }

            s.isLoadingBackwards = false
            s.isInitialized = true
          })
        } catch {
          // Ignore errors from stale requests
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
            state.backwardsCursor ?? state.logs[0]?.timestampUnix ?? Date.now()

          const result =
            await state._trpcClient.builds.buildLogsBackwardsReversed.query({
              teamIdOrSlug: state._params.teamIdOrSlug,
              templateId: state._params.templateId,
              buildId: state._params.buildId,
              level: state.level ?? undefined,
              cursor,
            })

          // Ignore stale response if init was called during fetch
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

          const result = await state._trpcClient.builds.buildLogsForward.query({
            teamIdOrSlug: state._params.teamIdOrSlug,
            templateId: state._params.templateId,
            buildId: state._params.buildId,
            level: state.level ?? undefined,
            cursor,
          })

          // Ignore stale response if init was called during fetch
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

export type BuildLogsStore = ReturnType<typeof createBuildLogsStore>
