export type AggregateState =
  | 'operational'
  | 'degraded'
  | 'downtime'
  | 'maintenance'
  | 'unknown'

export interface IncidentIOStatusPageSummaryResponse {
  status?: {
    indicator?: string
  }
  components?: Array<{
    status?: string
  }>
  scheduled_maintenances?: Array<{
    status?: string
  }>
}

export const STATUS_PAGE_LINK_URL = 'https://status.e2b.dev'
const INCIDENT_IO_STATUS_PAGE_URL = 'https://statuspage.incident.io/e2b-service'
export const STATUS_PAGE_SUMMARY_URL = `${INCIDENT_IO_STATUS_PAGE_URL}/api/v2/summary.json`

const STATUS_PRIORITY: Record<AggregateState, number> = {
  unknown: 0,
  operational: 1,
  maintenance: 2,
  degraded: 3,
  downtime: 4,
}

const INDICATOR_STATE: Record<string, AggregateState> = {
  none: 'operational',
  minor: 'degraded',
  major: 'degraded',
  critical: 'downtime',
  maintenance: 'maintenance',
}

const COMPONENT_STATE: Record<string, AggregateState> = {
  operational: 'operational',
  under_maintenance: 'maintenance',
  degraded_performance: 'degraded',
  partial_outage: 'degraded',
  full_outage: 'downtime',
  major_outage: 'downtime',
}

const MAINTENANCE_IN_PROGRESS_STATUSES = new Set([
  'in_progress',
  'maintenance_in_progress',
])

function stateFromValue(
  value: string | undefined,
  stateMap: Record<string, AggregateState>
) {
  return value ? stateMap[value] : undefined
}

function highestPriorityState(
  states: Array<AggregateState | undefined>
): AggregateState | undefined {
  return states.reduce<AggregateState | undefined>((highest, state) => {
    if (!state) return highest
    if (!highest) return state

    return STATUS_PRIORITY[state] > STATUS_PRIORITY[highest] ? state : highest
  }, undefined)
}

function getWorstComponentState(
  components: IncidentIOStatusPageSummaryResponse['components']
): AggregateState | undefined {
  return highestPriorityState(
    components?.map((component) =>
      stateFromValue(component.status, COMPONENT_STATE)
    ) ?? []
  )
}

function hasMaintenanceInProgress(
  maintenances: IncidentIOStatusPageSummaryResponse['scheduled_maintenances']
): boolean {
  return (
    maintenances?.some(
      (maintenance) =>
        !!maintenance.status &&
        MAINTENANCE_IN_PROGRESS_STATUSES.has(maintenance.status)
    ) ?? false
  )
}

export function getStatusPageStateFromSummary(
  data: IncidentIOStatusPageSummaryResponse
): AggregateState {
  const indicatorState = stateFromValue(data.status?.indicator, INDICATOR_STATE)
  const componentState = getWorstComponentState(data.components)
  const maintenanceState = hasMaintenanceInProgress(data.scheduled_maintenances)
    ? 'maintenance'
    : undefined

  return (
    highestPriorityState([indicatorState, componentState, maintenanceState]) ??
    'unknown'
  )
}
