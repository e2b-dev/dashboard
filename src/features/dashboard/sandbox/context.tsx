'use client'

import React, {
  createContext,
  useContext,
  ReactNode,
  useLayoutEffect,
  useState,
} from 'react'
import { Sandbox, SandboxInfo } from 'e2b'
import { supabase } from '@/lib/clients/supabase/client'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'

interface SandboxState {
  secondsLeft: number
  isRunning: boolean
}

interface SandboxContextValue {
  sandboxInfo: SandboxInfo
  sandbox: Sandbox | null
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
  teamId: string
}

export function SandboxProvider({
  children,
  sandboxInfo,
  teamId,
}: SandboxProviderProps) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [sandbox, setSandbox] = useState<Sandbox | null>(null)

  useLayoutEffect(() => {
    if (sandbox || !teamId) return

    const connectSandbox = async () => {
      const accessToken = await supabase.auth.getSession().then(({ data }) => {
        return data.session?.access_token
      })

      if (!accessToken) {
        throw new Error('No access token found')
      }

      const sbx = await Sandbox.connect(sandboxInfo.sandboxId, {
        headers: {
          ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
        },
      })
      setSandbox(sbx)
    }

    connectSandbox()
  }, [sandboxInfo.sandboxId, teamId, sandbox])

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
        sandbox,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
