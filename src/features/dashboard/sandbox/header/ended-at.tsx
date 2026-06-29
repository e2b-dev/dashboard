'use client'

import { Timestamp } from '@/features/dashboard/shared'
import CopyButton from '@/ui/copy-button'
import { useSandboxContext } from '../context'

export default function EndedAt() {
  const { sandboxInfo, sandboxLifecycle } = useSandboxContext()

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

  return (
    <div className="flex items-center gap-3">
      <Timestamp value={endedAt} />
      <CopyButton
        aria-label="Copy ended timestamp"
        value={endedAt}
        className="text-fg-secondary"
      />
    </div>
  )
}
