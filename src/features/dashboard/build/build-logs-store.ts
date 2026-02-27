'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { BuildLogDTO } from '@/server/api/models/builds.models'
import type { useTRPCClient } from '@/trpc/client'
import type { LogLevelFilter } from './logs-filter-params'

const FORWARD_CURSOR_PADDING_MS = 1

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

interface BuildLogsComputed {
  getNewestTimestamp: () => number | undefined
  getOldestTimestamp: () => number | undefined
}

export type BuildLogsStoreData = BuildLogsState &
  BuildLogsMutations &
  BuildLogsComputed

function getLogKey(log: BuildLogDTO): string {
  return `${log.timestampUnix}:${log.level}:${log.message}`
}

function deduplicateLogs(
  existingLogs: BuildLogDTO[],
  newLogs: BuildLogDTO[]
): BuildLogDTO[] {
  const existingKeys = new Set(existingLogs.map(getLogKey))
  return newLogs.filter((log) => !existingKeys.has(getLogKey(log)))
}

const initialState: BuildLogsState = {
  logs: [],
  hasMoreBackwards: true,
  isLoadingBackwards: false,
  isLoadingForwards: false,
  backwardsCursor: null,
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
          const result = await trpcClient.builds.buildLogsBackwards.query({
            teamIdOrSlug: params.teamIdOrSlug,
            templateId: params.templateId,
            buildId: params.buildId,
            level: level ?? undefined,
            cursor: Date.now(),
          })

          // Ignore stale response if a newer init was called
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
            state.backwardsCursor ?? state.getOldestTimestamp() ?? Date.now()

          const result =
            await state._trpcClient.builds.buildLogsBackwards.query({
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

export type BuildLogsStore = ReturnType<typeof createBuildLogsStore>
