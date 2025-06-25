'use client'

import { SandboxInfo } from '@/types/api'
import { useCallback, useEffect, useState } from 'react'

interface RemainingTimeProps {
  endAt: SandboxInfo['endAt']
}

export default function RemainingTime({ endAt }: RemainingTimeProps) {
  const getRemainingSeconds = useCallback(() => {
    if (!endAt) return 0
    const endTs = typeof endAt === 'number' ? endAt : new Date(endAt).getTime()
    return Math.max(0, Math.floor((endTs - Date.now()) / 1000))
  }, [endAt])

  const [remaining, setRemaining] = useState<number>(getRemainingSeconds)

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(getRemainingSeconds())
    }, 1000)

    return () => clearInterval(id)
  }, [endAt, getRemainingSeconds])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`

  return <p className="text-sm tabular-nums">{formatted}</p>
}
