'use client'

import CopyButton from '@/ui/copy-button'
import { useSandboxContext } from '../context'

export default function EndedAt() {
  const { sandboxInfo } = useSandboxContext()

  if (!sandboxInfo || (sandboxInfo.state !== 'killed' && sandboxInfo.state !== 'paused')) {
    return null
  }

  const endedAt = sandboxInfo.state === 'killed' ? sandboxInfo.stoppedAt : sandboxInfo.endAt

  if (!endedAt) {
    return <p>N/A</p>
  }

  const date = new Date(endedAt)
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
        value={endedAt}
        variant="ghost"
        size="slate"
        className="text-fg-secondary size-3.5"
      />
    </div>
  )
}
