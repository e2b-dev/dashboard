'use client'

import { useCallback, useEffect, useState } from 'react'

export function useResendVerificationCooldown(cooldownSeconds: number) {
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!cooldownEndsAt) {
      return
    }

    const updateSecondsLeft = () => {
      const nextSecondsLeft = Math.ceil((cooldownEndsAt - Date.now()) / 1000)

      if (nextSecondsLeft <= 0) {
        setCooldownEndsAt(null)
        setSecondsLeft(0)
        return
      }

      setSecondsLeft(nextSecondsLeft)
    }

    updateSecondsLeft()
    const intervalId = window.setInterval(updateSecondsLeft, 1000)

    return () => window.clearInterval(intervalId)
  }, [cooldownEndsAt])

  const startCooldown = useCallback(() => {
    setCooldownEndsAt(Date.now() + cooldownSeconds * 1000)
    setSecondsLeft(cooldownSeconds)
  }, [cooldownSeconds])

  return {
    secondsLeft,
    isCoolingDown: secondsLeft > 0,
    startCooldown,
  }
}
