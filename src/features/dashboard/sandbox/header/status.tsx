'use client'

import { Badge } from '@/ui/primitives/badge'
import { Circle, Square } from 'lucide-react'
import { useSandboxContext } from '../context'

export default function Status() {
  const { sandboxInfo, isRunning } = useSandboxContext()
  const state = sandboxInfo?.state

  if (state === 'paused') {
    return (
      <Badge variant="warning" className="uppercase">
        <Square className="size-2 fill-current" />
        Paused
      </Badge>
    )
  }

  return (
    <Badge variant={isRunning ? 'positive' : 'error'} className="uppercase">
      {isRunning ? (
        <Circle className="size-2 animate-pulse fill-current" />
      ) : (
        <Square className="size-2 fill-current" />
      )}
      {isRunning ? 'Running' : 'Stopped'}
    </Badge>
  )
}
