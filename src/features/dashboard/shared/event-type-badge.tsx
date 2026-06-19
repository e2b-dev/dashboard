import { SandboxLifecycleEventTypeSchema } from '@/core/modules/sandboxes/lifecycle-event-types'
import { Badge } from '@/ui/primitives/badge'
import { SANDBOX_EVENT_TYPE_MAP } from './event-type-map'

export const EventTypeBadge = ({ type }: { type: string }) => {
  const parsed = SandboxLifecycleEventTypeSchema.safeParse(type)

  if (!parsed.success) {
    return (
      <Badge variant="default" size="sm" className="align-middle uppercase">
        {type}
      </Badge>
    )
  }

  const { icon: IconComponent, label } = SANDBOX_EVENT_TYPE_MAP[parsed.data]

  return (
    <Badge variant="default" size="sm" className="align-middle uppercase">
      <IconComponent />
      {label}
    </Badge>
  )
}
