'use client'

import { Badge } from '@/ui/primitives/badge'
import { DotIcon } from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'

export default function Status() {
  const { isRunning } = useSandboxContext()

  return (
    <Badge variant={isRunning ? 'positive' : 'error'} className="uppercase">
      <DotIcon className={isRunning ? 'size-3 animate-pulse fill-current' : 'size-3 fill-current'} />
      {isRunning ? 'Running' : 'Stopped'}
    </Badge>
  )
}
