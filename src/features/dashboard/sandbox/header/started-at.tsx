'use client'

import {
  formatZonedRelativeDayTime,
  useTimezone,
} from '@/features/dashboard/timezone'
import CopyButton from '@/ui/copy-button'
import { useSandboxContext } from '../context'

export default function StartedAt() {
  const { sandboxLifecycle } = useSandboxContext()
  const { timezone } = useTimezone()

  const startedAt = sandboxLifecycle?.createdAt
  if (!startedAt) return null

  const { prefix, time: timeStr } = formatZonedRelativeDayTime(
    startedAt,
    timezone
  )

  return (
    <div className="flex items-center gap-1">
      <p>
        {prefix}, {timeStr}
      </p>
      <CopyButton value={startedAt} />
    </div>
  )
}
