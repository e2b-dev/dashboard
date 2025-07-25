'use client'

import { useState, useLayoutEffect, useCallback } from 'react'
import { useSandboxContext } from '../context'

export default function RanFor() {
  const { sandboxInfo, isRunning } = useSandboxContext()

  const state = sandboxInfo?.state
  const startedAt = sandboxInfo?.startedAt
  const endAt = sandboxInfo?.endAt

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
    if (!startedAt || !endAt || !isRunning) return

    const interval = setInterval(
      () => {
        setRanFor(calcRanFor())
      },
      new Date(endAt || Date.now()).getTime() - new Date(startedAt).getTime() <
        60000
        ? 1000
        : 5000
    )

    return () => clearInterval(interval)
  }, [calcRanFor, startedAt, endAt, isRunning])

  if (!sandboxInfo) {
    return null
  }

  return <p>{ranFor}</p>
}
