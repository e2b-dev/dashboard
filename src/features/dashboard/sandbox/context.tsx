'use client'

import React, {
  createContext,
  useContext,
  ReactNode,
  useLayoutEffect,
  useState,
} from 'react'
import { SandboxInfo } from 'e2b'

interface SandboxState {
  secondsLeft: number
  isRunning: boolean
}

interface SandboxContextValue {
  sandboxInfo: SandboxInfo
  state: SandboxState
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
}

export function SandboxProvider({
  children,
  sandboxInfo,
}: SandboxProviderProps) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useLayoutEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()

      if (sandboxInfo.endAt <= now) {
        setIsRunning(false)
        setSecondsLeft(0)
        clearInterval(interval)
      } else {
        setIsRunning(true)
      }

      const diff = sandboxInfo.endAt.getTime() - now.getTime()
      setSecondsLeft(Math.max(0, Math.floor(diff / 1000)))
    }, 1000)

    return () => {
      if (!interval) return
      clearInterval(interval)
    }
  }, [sandboxInfo.sandboxId, sandboxInfo.endAt])

  const state = {
    secondsLeft,
    isRunning,
  }

  return (
    <SandboxContext.Provider
      value={{
        sandboxInfo,
        state,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
