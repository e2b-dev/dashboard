'use client'

import { useTimezone } from '@/features/dashboard/timezone'
import { formatDate, getRelativeDay } from '@/lib/utils/formatting'
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
      <CopyButton value={startedAt} />
    </div>
  )
}
