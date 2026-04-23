import {
  getSandboxLifecycleEventLabel,
  type SandboxLifecycleEventType,
  sandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import { Badge } from '@/ui/primitives/badge'
import {
  BlockIcon,
  CheckIcon,
  DotIcon,
  type Icon,
  PausedIcon,
  RefreshIcon,
  RunningIcon,
} from '@/ui/primitives/icons'

const SANDBOX_EVENT_TYPE_ICON_MAP: Record<SandboxLifecycleEventType, Icon> = {
  'sandbox.lifecycle.created': CheckIcon,
  'sandbox.lifecycle.updated': RefreshIcon,
  'sandbox.lifecycle.paused': PausedIcon,
  'sandbox.lifecycle.resumed': RunningIcon,
  'sandbox.lifecycle.killed': BlockIcon,
}

export const SandboxEventTypeBadge = ({ type }: { type: string }) => {
  const parsedType = sandboxLifecycleEventTypeSchema.safeParse(type)
  const IconComponent = parsedType.success
    ? SANDBOX_EVENT_TYPE_ICON_MAP[parsedType.data]
    : DotIcon

  return (
    <Badge variant="default" size="sm" className="uppercase">
      <IconComponent />
      {getSandboxLifecycleEventLabel(type)}
    </Badge>
  )
}
