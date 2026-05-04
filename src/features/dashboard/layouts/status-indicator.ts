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

function stateFromIndicator(indicator: string | undefined) {
  if (indicator === 'none') return 'operational'
  if (indicator === 'minor') return 'degraded'
  if (indicator === 'major') return 'degraded'
  if (indicator === 'critical') return 'downtime'
  if (indicator === 'maintenance') return 'maintenance'

  return undefined
}

function getWorstComponentState(
  components: IncidentIOStatusPageSummaryResponse['components']
): AggregateState | undefined {
  const componentStatuses =
    components?.map((component) => component.status) ?? []

  if (componentStatuses.includes('major_outage')) return 'downtime'
  if (componentStatuses.includes('partial_outage')) return 'degraded'
  if (componentStatuses.includes('degraded_performance')) return 'degraded'
  if (componentStatuses.includes('under_maintenance')) return 'maintenance'

  return undefined
}

function hasMaintenanceInProgress(
  maintenances: IncidentIOStatusPageSummaryResponse['scheduled_maintenances']
) {
  return maintenances?.some(
    (maintenance) => maintenance.status === 'maintenance_in_progress'
  )
}

export function getStatusPageStateFromSummary(
  data: IncidentIOStatusPageSummaryResponse
): AggregateState {
  if (hasMaintenanceInProgress(data.scheduled_maintenances))
    return 'maintenance'

  return (
    stateFromIndicator(data.status?.indicator) ??
    getWorstComponentState(data.components) ??
    'unknown'
  )
}
