'use client'

import { MetricsResponse } from '@/app/api/teams/[teamId]/sandboxes/metrics/types'
import { SANDBOXES_DETAILS_METRICS_POLLING_MS } from '@/configs/intervals'
import { SandboxInfo } from '@/types/api'
import { ClientSandboxMetric } from '@/types/sandboxes.types'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import useSWR from 'swr'

interface SandboxContextValue {
  sandboxInfo?: SandboxInfo
  lastMetrics?: ClientSandboxMetric
  isRunning: boolean

  isSandboxInfoLoading: boolean
  refetchSandboxInfo: () => void
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
  serverSandboxInfo?: SandboxInfo
  teamId: string
  isRunning: boolean
}

export function SandboxProvider({
  children,
  serverSandboxInfo,
  teamId,
  isRunning,
}: SandboxProviderProps) {
  const [isRunningState, setIsRunningState] = useState(isRunning)
  const [lastFallbackData, setLastFallbackData] = useState(serverSandboxInfo)

  const {
    data: sandboxInfoData,
    mutate: refetchSandboxInfo,
    isLoading: isSandboxInfoLoading,
    isValidating: isSandboxInfoValidating,
  } = useSWR<SandboxInfo | void>(
    !serverSandboxInfo?.sandboxID
      ? null
      : [`/api/sandbox/details`, serverSandboxInfo?.sandboxID],
    async ([url]) => {
      if (!serverSandboxInfo?.sandboxID) return

      const origin = document.location.origin

      const requestUrl = new URL(url, origin)

      requestUrl.searchParams.set('teamId', teamId)
      requestUrl.searchParams.set('sandboxId', serverSandboxInfo.sandboxID)

      const response = await fetch(requestUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const status = response.status

        if (status === 404) {
          setIsRunningState(false)
          return
        }

        if (!isRunningState) {
          setIsRunningState(true)
        }

        throw new Error(`Failed to fetch sandbox info: ${status}`)
      }

      return (await response.json()) as SandboxInfo
    },
    {
      fallbackData: lastFallbackData,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: false,
    }
  )

  const { data: metricsData } = useSWR(
    !serverSandboxInfo?.sandboxID
      ? null
      : [
          `/api/teams/${teamId}/sandboxes/metrics`,
          serverSandboxInfo?.sandboxID,
        ],
    async ([url]) => {
      if (!serverSandboxInfo?.sandboxID || !isRunning) return null

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sandboxIds: [serverSandboxInfo.sandboxID] }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const { error } = await response.json()

        throw new Error(error || 'Failed to fetch metrics')
      }

      const data = (await response.json()) as MetricsResponse

      return data.metrics[serverSandboxInfo.sandboxID]
    },
    {
      refreshInterval: SANDBOXES_DETAILS_METRICS_POLLING_MS,
      errorRetryInterval: 1000,
      errorRetryCount: 3,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  useEffect(() => {
    if (serverSandboxInfo) {
      setLastFallbackData(serverSandboxInfo)
    }
  }, [serverSandboxInfo])

  return (
    <SandboxContext.Provider
      value={{
        sandboxInfo: sandboxInfoData || undefined,
        isRunning: isRunningState,
        lastMetrics: metricsData || undefined,
        isSandboxInfoLoading: isSandboxInfoLoading || isSandboxInfoValidating,
        refetchSandboxInfo,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
