export type DeploymentCheckStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'skipped'
  | 'failed'

type DeploymentEvent = {
  created_at: string
  message: string
  phase: string
}

type DeploymentOperation = {
  id: string
}

// Event slicing remains a client concern because it only scopes the raw log.
// Deployment phases and completion state come from the backend-owned team view.
export function eventsForOperation(
  events: DeploymentEvent[],
  operation?: DeploymentOperation
) {
  if (!operation) return []
  const startIndex = events.findLastIndex(
    (event) =>
      event.phase === 'operation_started' &&
      event.message.includes(operation.id)
  )
  return startIndex >= 0 ? events.slice(startIndex) : []
}
