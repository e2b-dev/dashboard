'use client'

import CopyButton from '@/ui/copy-button'
import { useSandboxContext } from '../context'

export default function StartedAt() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo) {
    return null
  }

  const startedAt = sandboxInfo.startedAt

  const date = new Date(startedAt)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const isYesterday =
    date.toDateString() ===
    new Date(now.setDate(now.getDate() - 1)).toDateString()

  const prefix = isToday
    ? 'Today'
    : isYesterday
      ? 'Yesterday'
      : date.toLocaleDateString()

  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="flex items-center gap-3">
      <p>
        {prefix}, {timeStr}
      </p>
      <CopyButton
        value={startedAt}
        variant="ghost"
        size="slate"
        className="text-fg-300 size-3.5"
      />
    </div>
  )
}
