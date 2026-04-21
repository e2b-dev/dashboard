import {
  getSandboxLifecycleEventLabel,
  type SandboxLifecycleEventType,
  sandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import { Badge, type BadgeProps } from '@/ui/primitives/badge'

const SANDBOX_LIFECYCLE_EVENT_VARIANTS: Record<
  SandboxLifecycleEventType,
  NonNullable<BadgeProps['variant']>
> = {
  'sandbox.lifecycle.created': 'positive',
  'sandbox.lifecycle.updated': 'main',
  'sandbox.lifecycle.paused': 'warning',
  'sandbox.lifecycle.resumed': 'info',
  'sandbox.lifecycle.killed': 'error',
}

export const SandboxEventTypeBadge = ({ type }: { type: string }) => {
  const parsedType = sandboxLifecycleEventTypeSchema.safeParse(type)
  const variant = parsedType.success
    ? SANDBOX_LIFECYCLE_EVENT_VARIANTS[parsedType.data]
    : 'default'

  return (
    <Badge variant={variant} className="w-fit uppercase h-[18px]">
      {getSandboxLifecycleEventLabel(type)}
    </Badge>
  )
}
