import {
  createLoader,
  parseAsString,
  parseAsStringEnum,
} from 'nuqs/server'

const SANDBOX_EVENTS_ORDER_VALUES: ['asc', 'desc'] = ['asc', 'desc']

type SandboxEventsOrder = (typeof SANDBOX_EVENTS_ORDER_VALUES)[number]

const sandboxEventsFilterParams = {
  type: parseAsString,
  order: parseAsStringEnum(SANDBOX_EVENTS_ORDER_VALUES),
}

const loadSandboxEventsFilters = createLoader(sandboxEventsFilterParams)

export {
  loadSandboxEventsFilters,
  SANDBOX_EVENTS_ORDER_VALUES,
  sandboxEventsFilterParams,
}
export type { SandboxEventsOrder }
