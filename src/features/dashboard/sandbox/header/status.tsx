'use client'

import { Badge } from '@/ui/primitives/badge'
import { Circle } from 'lucide-react'
import { useSandboxContext } from '../context'

export default function Status() {
  const { isRunning } = useSandboxContext()

  return (
    <Badge
      variant={isRunning ? 'success' : 'error'}
      className="gap-2 uppercase"
    >
      <Circle className="size-2 animate-pulse fill-current" />
      {isRunning ? 'Running' : 'Stopped'}
    </Badge>
  )
}
