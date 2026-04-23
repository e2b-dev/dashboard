import { getSandboxLifecycleEventLabel } from '@/core/modules/sandboxes/lifecycle-event-types'
import { Badge } from '@/ui/primitives/badge'

export const SandboxEventTypeBadge = ({ type }: { type: string }) => {
  return (
    <Badge variant="default" size="sm" className="uppercase">
      {getSandboxLifecycleEventLabel(type)}
    </Badge>
  )
}
