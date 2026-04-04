'use client'

import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { SANDBOXES_METRICS_POLLING_MS } from '@/configs/intervals'
import { useAlignedRefetchInterval } from '@/lib/hooks/use-aligned-refetch-interval'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { isNotFoundError } from '@/lib/utils/trpc-errors'
import type {
  SandboxDetailsDTO,
  SandboxEventDTO,
} from '@/server/api/models/sandboxes.models'
import { useTRPC } from '@/trpc/client'
import { SANDBOX_LIFECYCLE_EVENT_KILLED } from './monitoring/utils/constants'

export interface SandboxLifecycleState {
  createdAt: string | null
  pausedAt: string | null
  endedAt: string | null
  events: SandboxEventDTO[]
}

interface SandboxContextValue {
  sandboxInfo?: SandboxDetailsDTO
  sandboxLifecycle: SandboxLifecycleState | null
  isRunning: boolean
  isSandboxNotFound: boolean

  isSandboxInfoLoading: boolean
  refetchSandboxInfo: () => Promise<void>
}

const SandboxContext = createContext<SandboxContextValue | null>(null)

export function useSandboxContext() {
  const context = useContext(SandboxContext)
  if (!context) {
    throw new Error('useSandboxContext must be used within a SandboxProvider')
  }
  return context
}

interface SandboxProviderProps {
  children: ReactNode
}

function buildSandboxLifecycle(
  sandboxInfo: SandboxDetailsDTO | undefined
): SandboxLifecycleState | null {
  if (!sandboxInfo) {
    return null
  }

  const fallbackEndedAt =
    sandboxInfo.state === 'killed'
      ? (sandboxInfo.stoppedAt ?? sandboxInfo.endAt)
      : null

  return {
    createdAt: sandboxInfo.lifecycle?.createdAt ?? sandboxInfo.startedAt,
    pausedAt: sandboxInfo.lifecycle?.pausedAt ?? null,
    endedAt: sandboxInfo.lifecycle?.endedAt ?? fallbackEndedAt,
    events: sandboxInfo.lifecycle?.events ?? [],
  }
}

export function SandboxProvider({ children }: SandboxProviderProps) {
  const { teamIdOrSlug, sandboxId } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/sandboxes/[sandboxId]'>()

  const trpc = useTRPC()
  const getAlignedRefetchInterval = useAlignedRefetchInterval({
    intervalMs: SANDBOXES_METRICS_POLLING_MS,
  })

  const {
    data: sandboxInfoData,
    error: sandboxInfoError,
    isLoading: isSandboxInfoLoading,
    isFetching: isSandboxInfoFetching,
    refetch,
  } = useQuery(
    trpc.sandbox.details.queryOptions(
      { teamIdOrSlug, sandboxId },
      {
        retry: false,
        refetchInterval: (query) => {
          const sandboxInfo = query.state.data as SandboxDetailsDTO | undefined
          const state = sandboxInfo?.state

          // Keep polling when killed but the killed lifecycle event hasn't
          // been received yet, so the monitoring chart can capture final data.
          const isAwaitingKilledEvent =
            state === 'killed' &&
            !sandboxInfo?.lifecycle?.events?.some(
              (e) => e.type === SANDBOX_LIFECYCLE_EVENT_KILLED
            )
          const shouldPoll =
            state === 'running' || state === 'paused' || isAwaitingKilledEvent

          return getAlignedRefetchInterval(shouldPoll)
        },
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: Number.POSITIVE_INFINITY,
      }
    )
  )

  const refetchSandboxInfo = useCallback(async () => {
    await refetch()
  }, [refetch])

  const sandboxState = sandboxInfoData?.state
  const isRunning = sandboxState === 'running'

  const isSandboxNotFound =
    !sandboxInfoData && isNotFoundError(sandboxInfoError)

  const isSandboxInfoPending = isSandboxInfoLoading || isSandboxInfoFetching
  const sandboxLifecycle = useMemo(
    () => buildSandboxLifecycle(sandboxInfoData),
    [sandboxInfoData]
  )

  return (
    <SandboxContext.Provider
      value={{
        sandboxInfo: sandboxInfoData,
        sandboxLifecycle,
        isRunning,
        isSandboxNotFound,
        isSandboxInfoLoading: isSandboxInfoPending,
        refetchSandboxInfo,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
