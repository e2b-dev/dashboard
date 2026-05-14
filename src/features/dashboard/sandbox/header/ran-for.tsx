'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSandboxContext } from '../context'
import { SANDBOX_LIFECYCLE_EVENT_RESUMED } from '../monitoring/utils/constants'

export default function RanFor() {
  const { sandboxInfo, sandboxLifecycle, isRunning } = useSandboxContext()

  const state = sandboxInfo?.state
  const startedAt = sandboxLifecycle?.createdAt
  const pausedAt = sandboxLifecycle?.pausedAt
  const endedAt = sandboxLifecycle?.endedAt
  const events = sandboxLifecycle?.events

  const lastResumedAt = useMemo(() => {
    if (!events) return null
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].type === SANDBOX_LIFECYCLE_EVENT_RESUMED) {
        return events[i].timestamp
      }
    }
    return null
  }, [events])

  const startDate = useMemo(() => {
    const effectiveStart = lastResumedAt ?? startedAt
    return effectiveStart ? new Date(effectiveStart) : null
  }, [lastResumedAt, startedAt])
  const pausedDate = useMemo(
    () => (pausedAt ? new Date(pausedAt) : null),
    [pausedAt]
  )
  const endedDate = useMemo(
    () => (endedAt ? new Date(endedAt) : null),
    [endedAt]
  )

  const calcRanFor = useCallback(() => {
    if (!startDate) return '-'
    if (state === 'killed' && !endedDate) return 'N/A'

    const end =
      state === 'running'
        ? new Date()
        : state === 'paused'
          ? (pausedDate ?? new Date())
          : (endedDate ?? new Date())
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
  }, [endedDate, pausedDate, startDate, state])

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
