import { createParser, parseAsArrayOf } from 'nuqs/server'
import {
  SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX,
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'

// Maps URL value to lifecycle event type, e.g. "created" -> "sandbox.lifecycle.created".
const eventTypeParser = createParser({
  parse: (value) => {
    const result = SandboxLifecycleEventTypeSchema.safeParse(
      `${SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX}${value}`
    )
    return result.success ? result.data : null
  },
  serialize: (value: SandboxLifecycleEventType) =>
    value.slice(SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX.length),
})

const eventTypeFilterParams = {
  types: parseAsArrayOf(eventTypeParser),
}

export { eventTypeFilterParams }
