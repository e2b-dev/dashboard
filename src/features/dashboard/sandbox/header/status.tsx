import { SandboxInfo } from '@/types/api'
import { Badge } from '@/ui/primitives/badge'
import { Circle } from 'lucide-react'

interface StatusProps {
  state: SandboxInfo['state']
}

export default function Status({ state }: StatusProps) {
  return (
    <Badge
      variant={state === 'running' ? 'success' : 'error'}
      className="gap-2 uppercase"
    >
      <Circle className="size-2 fill-current" />
      {state}
    </Badge>
  )
}
