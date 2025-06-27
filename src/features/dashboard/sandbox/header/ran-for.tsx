'use client'

import { SandboxInfo } from '@/types/api'
import { useState, useEffect, useLayoutEffect, useCallback } from 'react'

interface RanForProps {
  state?: SandboxInfo['state']
  startedAt: SandboxInfo['startedAt']
  endAt?: SandboxInfo['endAt']
}

export default function RanFor({ state, startedAt, endAt }: RanForProps) {
  const calcRanFor = useCallback(() => {
    if (!startedAt) return '-'

    const start = new Date(startedAt)
    const end =
      state === 'running' ? new Date() : endAt ? new Date(endAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    if (diffMs < 0) return '-'

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    if (hours === 0 && minutes === 0) {
      return `${seconds} seconds`
    }

    const parts = []
    if (hours > 0) parts.push(`${hours} hours`)
    if (minutes > 0) parts.push(`${minutes} minutes`)
    return parts.join(' ')
  }, [startedAt, state, endAt])

  const [ranFor, setRanFor] = useState<string>(calcRanFor())

  useLayoutEffect(() => {
    const interval = setInterval(() => {
      setRanFor(calcRanFor())
    }, 5000)

    return () => clearInterval(interval)
  }, [calcRanFor])

  return <p>{ranFor}</p>
}
