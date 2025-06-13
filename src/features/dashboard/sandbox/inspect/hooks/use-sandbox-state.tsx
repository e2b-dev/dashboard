import { SandboxInfo } from 'e2b'
import { useLayoutEffect, useState } from 'react'

export interface SandboxState {
  secondsLeft: number
  isRunning: boolean
}

export function useSandboxState(sandboxInfo: SandboxInfo): SandboxState {
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

  return {
    secondsLeft,
    isRunning,
  }
}
