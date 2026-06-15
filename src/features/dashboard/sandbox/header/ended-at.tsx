'use client'

import { useTimezone } from '@/features/dashboard/timezone'
import { formatDate, getRelativeDay } from '@/lib/utils/formatting'
import CopyButton from '@/ui/copy-button'
import { useSandboxContext } from '../context'

export default function EndedAt() {
  const { sandboxInfo, sandboxLifecycle } = useSandboxContext()
  const { timezone } = useTimezone()

  if (
    !sandboxInfo ||
    (sandboxInfo.state !== 'killed' && sandboxInfo.state !== 'paused')
  )
    return null

  const endedAt =
    sandboxInfo.state === 'killed'
      ? sandboxLifecycle?.endedAt
      : sandboxLifecycle?.pausedAt

  if (!endedAt) return <p>N/A</p>

  const relativeDay = getRelativeDay(endedAt, timezone)
  const timeStr = formatDate(endedAt, { timezone, format: 'time' })

  return (
    <div className="flex items-center gap-3">
      <p>
        {relativeDay}, {timeStr}
      </p>
      <CopyButton value={endedAt} className="text-fg-secondary" />
    </div>
  )
}
