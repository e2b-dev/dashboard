import { z } from 'zod'

const SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX = 'sandbox.lifecycle.'

const SandboxLifecycleEventTypeSchema = z.enum([
  `${SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX}created`,
  `${SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX}updated`,
  `${SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX}paused`,
  `${SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX}resumed`,
  `${SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX}killed`,
])

type SandboxLifecycleEventType = z.infer<typeof SandboxLifecycleEventTypeSchema>

export {
  SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX,
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
}
