export type AggregateState =
  | 'operational'
  | 'degraded'
  | 'downtime'
  | 'maintenance'
  | 'unknown'

export interface IncidentIOWidgetEvent {
  affected_components?: Array<{
    status?: string
  }>
}

export interface IncidentIOWidgetResponse {
  ongoing_incidents?: IncidentIOWidgetEvent[]
  in_progress_maintenances?: IncidentIOWidgetEvent[]
  scheduled_maintenances?: IncidentIOWidgetEvent[]
}

export function getStatusPageUrl() {
  return (process.env.NEXT_PUBLIC_STATUS_PAGE_URL ?? 'https://status.e2b.dev')
    .trim()
    .replace(/\/+$/, '')
}

export function getStatusPageWidgetUrl(statusPageUrl: string) {
  const configuredWidgetUrl =
    process.env.NEXT_PUBLIC_STATUS_PAGE_WIDGET_URL?.trim()

  if (configuredWidgetUrl) return configuredWidgetUrl

  return `${statusPageUrl}/api/widget`
}

function hasEvents(events: IncidentIOWidgetEvent[] | undefined) {
  return Array.isArray(events) && events.length > 0
}

function getWorstComponentState(
  events: IncidentIOWidgetEvent[] | undefined
): AggregateState | undefined {
  const componentStatuses =
    events?.flatMap(
      (event) =>
        event.affected_components?.map((component) => component.status) ?? []
    ) ?? []

  if (componentStatuses.includes('full_outage')) return 'downtime'
  if (componentStatuses.includes('partial_outage')) return 'degraded'
  if (componentStatuses.includes('degraded_performance')) return 'degraded'
  if (componentStatuses.includes('under_maintenance')) return 'maintenance'

  return undefined
}

export function getStatusPageStateFromWidget(
  data: IncidentIOWidgetResponse
): AggregateState {
  if (hasEvents(data.ongoing_incidents)) {
    return getWorstComponentState(data.ongoing_incidents) ?? 'degraded'
  }

  if (hasEvents(data.in_progress_maintenances)) return 'maintenance'

  return 'operational'
}
