'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { SandboxInfo, SandboxMetric } from '@/types/api'
import useSWR from 'swr'
import { SANDBOXE_DETAILS_LATEST_METRICS_POLLING_MS } from '@/configs/intervals'
import { MetricsResponse } from '@/app/api/teams/[teamId]/sandboxes/metrics/types'
import { ClientSandboxMetric } from '@/types/sandboxes.types'

interface SandboxContextValue {
  sandboxInfo: SandboxInfo
  lastMetrics?: ClientSandboxMetric
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
  sandboxInfo: SandboxInfo
  teamId: string
}

export function SandboxProvider({
  children,
  sandboxInfo,
  teamId,
}: SandboxProviderProps) {
  const { data } = useSWR(
    [`/api/teams/${teamId}/sandboxes/metrics`, sandboxInfo.sandboxID],
    async ([url]) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sandboxIds: [sandboxInfo.sandboxID] }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const { error } = await response.json()

        throw new Error(error || 'Failed to fetch metrics')
      }

      const data = (await response.json()) as MetricsResponse

      return data.metrics[sandboxInfo.sandboxID]
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

  return (
    <SandboxContext.Provider
      value={{
        sandboxInfo,
        lastMetrics: data,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
