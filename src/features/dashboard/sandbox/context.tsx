'use client'

import { MetricsResponse } from '@/app/api/teams/[teamId]/sandboxes/metrics/types'
import { SANDBOXE_DETAILS_LATEST_METRICS_POLLING_MS } from '@/configs/intervals'
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
  const { data } = useSWR(
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
      refreshInterval: SANDBOXE_DETAILS_LATEST_METRICS_POLLING_MS,
      errorRetryInterval: 1000,
      errorRetryCount: 3,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  const [sandboxInfo, setSandboxInfo] = useState(serverSandboxInfo)

  useEffect(() => {
    if (!serverSandboxInfo) return

    setSandboxInfo(serverSandboxInfo)
  }, [serverSandboxInfo])

  return (
    <SandboxContext.Provider
      value={{
        sandboxInfo,
        isRunning,
        lastMetrics: data || undefined,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
