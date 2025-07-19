'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { Sandbox } from '@/types/api'

interface SandboxContextValue {
  sandboxInfo: Sandbox
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
  sandboxInfo: Sandbox
}

export function SandboxProvider({
  children,
  sandboxInfo,
}: SandboxProviderProps) {
  return (
    <SandboxContext.Provider
      value={{
        sandboxInfo,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
