import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from 'nuqs/server'

const SANDBOX_EVENTS_PAGE_SIZE = 20
const SANDBOX_EVENTS_ORDER_VALUES: ['asc', 'desc'] = ['asc', 'desc']

type SandboxEventsOrder = (typeof SANDBOX_EVENTS_ORDER_VALUES)[number]

const sandboxEventsFilterParams = {
  type: parseAsString,
  offset: parseAsInteger,
  order: parseAsStringEnum(SANDBOX_EVENTS_ORDER_VALUES),
}

const loadSandboxEventsFilters = createLoader(sandboxEventsFilterParams)

export {
  loadSandboxEventsFilters,
  SANDBOX_EVENTS_ORDER_VALUES,
  SANDBOX_EVENTS_PAGE_SIZE,
  sandboxEventsFilterParams,
}
export type { SandboxEventsOrder }
