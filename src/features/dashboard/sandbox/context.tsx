'use client'

import { SANDBOXES_DETAILS_METRICS_POLLING_MS } from '@/configs/intervals'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { isNotFoundError } from '@/lib/utils/trpc-errors'
import type { SandboxDetailsDTO } from '@/server/api/models/sandboxes.models'
import { useTRPC } from '@/trpc/client'
import type { ClientSandboxMetric } from '@/types/sandboxes.types'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext } from 'react'

interface SandboxContextValue {
  sandboxInfo?: SandboxDetailsDTO
  lastMetrics?: ClientSandboxMetric
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

export function SandboxProvider({ children }: SandboxProviderProps) {
  const { teamIdOrSlug, sandboxId } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/sandboxes/[sandboxId]'>()

  const trpc = useTRPC()

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

  const sandboxInfoId = sandboxInfoData?.sandboxID
  const isRunning = sandboxInfoData?.state === 'running'

  const { data: sandboxesMetricsData } = useQuery(
    trpc.sandboxes.getSandboxesMetrics.queryOptions(
      { teamIdOrSlug, sandboxIds: [sandboxInfoId ?? sandboxId] },
      {
        enabled: Boolean(sandboxInfoId) && isRunning,
        retry: 3,
        retryDelay: 1_000,
        refetchInterval: isRunning
          ? SANDBOXES_DETAILS_METRICS_POLLING_MS
          : false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      }
    )
  )

  const metricsData = sandboxInfoId
    ? sandboxesMetricsData?.metrics[sandboxInfoId]
    : undefined

  const isSandboxNotFound =
    !sandboxInfoData && isNotFoundError(sandboxInfoError)

  const isSandboxInfoPending = isSandboxInfoLoading || isSandboxInfoFetching

  return (
    <SandboxContext.Provider
      value={{
        sandboxInfo: sandboxInfoData,
        isRunning,
        isSandboxNotFound,
        lastMetrics: metricsData,
        isSandboxInfoLoading: isSandboxInfoPending,
        refetchSandboxInfo,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
