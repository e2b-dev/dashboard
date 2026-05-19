'use client'

import { Timestamp } from '@/features/dashboard/shared'
import CopyButton from '@/ui/copy-button'
import { useSandboxContext } from '../context'

const StartedAt = () => {
  const { sandboxLifecycle } = useSandboxContext()

  const startedAt = sandboxLifecycle?.createdAt
  if (!startedAt) return null

  return (
    <div className="flex items-center gap-1">
      <Timestamp value={startedAt} />
      <CopyButton aria-label="Copy started timestamp" value={startedAt} />
    </div>
  )
}

export default StartedAt
