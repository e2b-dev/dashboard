'use client'

import { Badge } from '@/ui/primitives/badge'
import { DotIcon, PausedIcon } from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'

export default function Status() {
  const { sandboxInfo, isRunning } = useSandboxContext()
  const state = sandboxInfo?.state

  if (state === 'paused') {
    return (
      <Badge variant="warning" className="uppercase">
        <PausedIcon className="size-2 fill-current" />
        Paused
      </Badge>
    )
  }

  return (
    <Badge variant={isRunning ? 'positive' : 'error'} className="uppercase">
      <DotIcon
        className={
          isRunning
            ? 'size-3 animate-pulse fill-current'
            : 'size-3 fill-current'
        }
      />
      {isRunning ? 'Running' : 'Stopped'}
    </Badge>
  )
}
