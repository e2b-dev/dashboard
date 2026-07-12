export type DeploymentCheckStatus = 'pending' | 'running' | 'passed' | 'failed'

type DeploymentEvent = {
  created_at: string
  message: string
  phase: string
}

type DeploymentOperation = {
  id: string
  kind: string
  status: string
}

export type DeploymentCheck = {
  label: string
  message: string
  status: DeploymentCheckStatus
  timestamp?: string
}

const deployDefinitions = [
  {
    label: 'Infrastructure applied',
    phase: 'prepare_artifacts',
    messageIncludes: 'Runtime artifacts are ready',
  },
  {
    label: 'Deployment DNS resolved',
    phase: 'dns_ready',
    messageIncludes: 'Deployment DNS resolved',
  },
  {
    label: 'Nomad route reachable',
    phase: 'wait_for_nomad',
    messageIncludes: 'Nomad is reachable',
  },
  {
    label: 'Services converged',
    phase: 'health_check',
    messageIncludes: 'Terraform stages finished',
  },
  {
    label: 'Edge API healthy',
    phase: 'health_check',
    messageIncludes: 'passed',
  },
  {
    label: 'Team routing attached',
    phase: 'registering_cluster',
    messageIncludes: 'Team attached',
  },
  {
    label: 'Base template built',
    phase: 'building_base_template',
    messageIncludes: ' is ready',
  },
  {
    label: 'Sandbox smoke passed',
    phase: 'smoke_testing',
    messageIncludes: 'Sandbox smoke passed',
  },
] as const

const destroyDefinitions = [
  {
    label: 'Terraform access verified',
    phase: 'terraform_destroy_preflight',
    messageIncludes: 'Terraform backend is ready',
  },
  {
    label: 'Team routing detached',
    phase: 'detaching_cluster',
    messageIncludes: 'Team routing detached',
  },
  {
    label: 'Infrastructure destroyed',
    phase: 'terraform_destroy',
    messageIncludes: 'Terraform destroy finished',
  },
] as const

const activeStatuses = new Set([
  'queued',
  'starting',
  'planning',
  'plan_ready',
  'applying',
  'validating',
  'attaching',
  'stale',
])

export function buildDeploymentChecks(
  events: DeploymentEvent[],
  operation?: DeploymentOperation
): DeploymentCheck[] {
  const definitions =
    operation?.kind === 'destroy' ? destroyDefinitions : deployDefinitions
  if (!operation) {
    return definitions.map(({ label }) => ({
      label,
      message: 'Waiting for a deployment operation.',
      status: 'pending',
    }))
  }

  const startIndex = events.findIndex(
    (event) =>
      event.phase === 'operation_started' &&
      event.message.includes(operation.id)
  )
  const operationEvents = startIndex >= 0 ? events.slice(startIndex) : []
  const matches = definitions.map((definition) =>
    operationEvents.find(
      (event) =>
        event.phase === definition.phase &&
        event.message.includes(definition.messageIncludes)
    )
  )
  const firstIncomplete = matches.findIndex((event) => !event)
  const active = activeStatuses.has(operation.status)
  const failed = new Set([
    'failed_retryable',
    'failed_terminal',
    'cancelled',
  ]).has(operation.status)

  return definitions.map(({ label }, index) => {
    const event = matches[index]
    if (event) {
      return {
        label,
        message: event.message,
        status: 'passed',
        timestamp: event.created_at,
      }
    }

    if (operation.status === 'succeeded') {
      return {
        label,
        message: 'Already satisfied; no work was required in this operation.',
        status: 'passed',
      }
    }

    if (matches.slice(index + 1).some(Boolean)) {
      return {
        label,
        message: 'Already satisfied before the next deployment phase.',
        status: 'passed',
      }
    }

    const isCurrent = index === firstIncomplete
    return {
      label,
      message:
        isCurrent && failed
          ? 'The operation stopped before this check completed.'
          : isCurrent && active
            ? 'In progress.'
            : 'Waiting for the previous check.',
      status:
        isCurrent && failed
          ? 'failed'
          : isCurrent && active
            ? 'running'
            : 'pending',
    }
  })
}
