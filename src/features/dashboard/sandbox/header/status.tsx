import { SandboxInfo } from '@/types/api'
import { Badge } from '@/ui/primitives/badge'

interface StatusProps {
  state: SandboxInfo['state']
}

export default function Status({ state }: StatusProps) {
  return (
    <Badge
      variant={state === 'running' ? 'success' : 'error'}
      className="gap-1 uppercase"
    >
      <span className="line-height-0 h-0 w-2.5 -translate-y-0.25 align-middle text-xl leading-0">
        •
      </span>
      {state}
    </Badge>
  )
}
