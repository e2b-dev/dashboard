'use client'

import {
  formatZonedRelativeDayTime,
  useTimezone,
} from '@/features/dashboard/timezone'
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

  const { prefix, time: timeStr } = formatZonedRelativeDayTime(
    endedAt,
    timezone
  )

  return (
    <div className="flex items-center gap-3">
      <p>
        {prefix}, {timeStr}
      </p>
      <CopyButton value={endedAt} className="text-fg-secondary" />
    </div>
  )
}
