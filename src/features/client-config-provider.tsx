'use client'

import { createContext, type ReactNode, useContext } from 'react'
import type { BrowserRuntimeConfig } from '@/core/shared/runtime-config'

const ClientConfigContext = createContext<BrowserRuntimeConfig | null>(null)

export function ClientConfigProvider({
  children,
  value,
}: {
  children: ReactNode
  value: BrowserRuntimeConfig
}) {
  return (
    <ClientConfigContext.Provider value={value}>
      {children}
    </ClientConfigContext.Provider>
  )
}

export function useClientConfig(): BrowserRuntimeConfig {
  const config = useContext(ClientConfigContext)

  if (!config) {
    throw new Error('useClientConfig must be used within ClientConfigProvider')
  }

  return config
}
