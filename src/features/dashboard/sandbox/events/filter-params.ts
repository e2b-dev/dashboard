import { createParser, parseAsArrayOf, parseAsStringEnum } from 'nuqs/server'
import {
  SANDBOX_LIFECYCLE_EVENT_TYPE_PREFIX,
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'

const SANDBOX_EVENTS_ORDER_VALUES: ['asc', 'desc'] = ['asc', 'desc']

type SandboxEventsOrder = (typeof SANDBOX_EVENTS_ORDER_VALUES)[number]

// Maps URL value to lifecycle event type, e.g. "created" -> "sandbox.lifecycle.created"
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

const sandboxEventsFilterParams = {
  types: parseAsArrayOf(eventTypeParser),
  order: parseAsStringEnum(SANDBOX_EVENTS_ORDER_VALUES),
}

export { type SandboxEventsOrder, sandboxEventsFilterParams }
