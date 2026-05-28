import type { SandboxLifecycleEventType } from '@/core/modules/sandboxes/lifecycle-event-types'
import {
  BlockIcon,
  CheckIcon,
  type Icon,
  PausedIcon,
  RefreshIcon,
  RunningIcon,
} from '@/ui/primitives/icons'

const SANDBOX_EVENT_TYPE_MAP: Record<
  SandboxLifecycleEventType,
  { icon: Icon; label: string }
> = {
  'sandbox.lifecycle.created': { icon: CheckIcon, label: 'Created' },
  'sandbox.lifecycle.updated': { icon: RefreshIcon, label: 'Updated' },
  'sandbox.lifecycle.paused': { icon: PausedIcon, label: 'Paused' },
  'sandbox.lifecycle.resumed': { icon: RunningIcon, label: 'Resumed' },
  'sandbox.lifecycle.killed': { icon: BlockIcon, label: 'Killed' },
}

export { SANDBOX_EVENT_TYPE_MAP }
