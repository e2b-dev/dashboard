'use client'

import {
  formatDate,
  getRelativeDay,
  useTimezone,
} from '@/features/dashboard/timezone'
import CopyButton from '@/ui/copy-button'
import { useSandboxContext } from '../context'

export default function StartedAt() {
  const { sandboxLifecycle } = useSandboxContext()
  const { timezone } = useTimezone()

  const startedAt = sandboxLifecycle?.createdAt
  if (!startedAt) return null

  const relativeDay = getRelativeDay(startedAt, timezone)
  const timeStr = formatDate(startedAt, { timezone, format: 'time' })

  return (
    <div className="flex items-center gap-1">
      <p>
        {relativeDay}, {timeStr}
      </p>
      <CopyButton aria-label="Copy started timestamp" value={startedAt} />
    </div>
  )
}
