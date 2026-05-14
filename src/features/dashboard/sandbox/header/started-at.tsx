'use client'

import { Timestamp } from '@/features/dashboard/shared'
import { useSandboxContext } from '../context'

const StartedAt = () => {
  const { sandboxLifecycle } = useSandboxContext()

  const startedAt = sandboxLifecycle?.createdAt
  if (!startedAt) return null

  return <Timestamp value={startedAt} />
}

export default StartedAt
