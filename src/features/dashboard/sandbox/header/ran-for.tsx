'use client'

import { SandboxInfo } from '@/types/api'
import { useState, useEffect } from 'react'

interface RanForProps {
  state?: SandboxInfo['state']
  startedAt: SandboxInfo['startedAt']
  endAt?: SandboxInfo['endAt']
}

export default function RanFor({ state, startedAt, endAt }: RanForProps) {
  const [ranFor, setRanFor] = useState<string>('-')

  useEffect(() => {
    function calcRanFor() {
      if (!startedAt) return '-'

      const start = new Date(startedAt)
      const end =
        state === 'running' ? new Date() : endAt ? new Date(endAt) : new Date()
      const diffMs = end.getTime() - start.getTime()
      if (diffMs < 0) return '-'

      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours} hours ${minutes} minutes`
    }

    setRanFor((prev) => {
      const next = calcRanFor()
      return prev !== next ? next : prev
    })

    const interval = setInterval(() => {
      setRanFor((prev) => {
        const next = calcRanFor()
        return prev !== next ? next : prev
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [state, startedAt, endAt])

  return <p>{ranFor}</p>
}
