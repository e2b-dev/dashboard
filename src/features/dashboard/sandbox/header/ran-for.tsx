'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSandboxContext } from '../context'

export default function RanFor() {
  const { sandboxInfo, isRunning } = useSandboxContext()

  const state = sandboxInfo?.state
  const startedAt = sandboxInfo?.startedAt
  const endAt = sandboxInfo?.endAt

  const startDate = useMemo(
    () => (startedAt ? new Date(startedAt) : null),
    [startedAt]
  )
  const endDate = useMemo(() => (endAt ? new Date(endAt) : null), [endAt])

  const calcRanFor = useCallback(() => {
    if (!startDate) return '-'

    const end = state === 'running' ? new Date() : (endDate ?? new Date())
    const start = startDate
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
  }, [startDate, state, endDate])

  const [ranFor, setRanFor] = useState<string>(calcRanFor())

  useEffect(() => {
    if (!startDate) return

    let timerId: ReturnType<typeof setTimeout>

    const tick = () => {
      setRanFor(calcRanFor())

      if (!isRunning) return

      const diffMs = Date.now() - startDate.getTime()
      const nextDelay = diffMs < 60_000 ? 1_000 : 3_000
      timerId = setTimeout(tick, nextDelay)
    }

    tick()

    return () => clearTimeout(timerId)
  }, [calcRanFor, startDate, isRunning])

  if (!sandboxInfo) {
    return null
  }

  return <p>{ranFor}</p>
}
