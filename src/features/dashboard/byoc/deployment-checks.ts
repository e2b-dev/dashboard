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
  kind: string
  status: string
}

export type DeploymentCheck = {
  group: DeploymentCheckGroup
  label: string
  message: string
  status: DeploymentCheckStatus
  timestamp?: string
}

export type DeploymentCheckGroup =
  | 'infrastructure'
  | 'applications'
  | 'verification'

type DeploymentCheckDefinition = {
  alternatePhases?: readonly string[]
  group: DeploymentCheckGroup
  label: string
  messageIncludes: string
  phase: string
  progressPhases?: readonly string[]
}

const workerAccessDefinition = {
  group: 'infrastructure',
  label: 'Worker access verified',
  phase: 'worker_access',
  messageIncludes: 'Worker can impersonate',
  progressPhases: ['operation_started'],
} as const

const deployDefinitions: readonly DeploymentCheckDefinition[] = [
  workerAccessDefinition,
  {
    group: 'infrastructure',
    label: 'Project setup and Redis',
    phase: 'foundation_complete',
    messageIncludes: 'completed',
    progressPhases: [
      'terraform_state',
      'foundation_plan',
      'foundation_plan_complete',
      'foundation_apply',
      'foundation_resource',
      'foundation_apply_complete',
    ],
  },
  {
    group: 'infrastructure',
    label: 'Network and compute',
    phase: 'base_infra_apply_complete',
    alternatePhases: ['base_infra_complete'],
    messageIncludes: '',
    progressPhases: [
      'base_infra_plan',
      'base_infra_plan_complete',
      'base_infra_apply',
      'base_infra_resource',
    ],
  },
  {
    group: 'infrastructure',
    label: 'Runtime artifacts ready',
    phase: 'prepare_artifacts',
    messageIncludes: 'Runtime artifacts are ready',
    progressPhases: ['prepare_artifacts'],
  },
  {
    group: 'infrastructure',
    label: 'Deployment DNS resolved',
    phase: 'dns_ready',
    messageIncludes: 'Deployment DNS resolved',
    progressPhases: ['dns_ready'],
  },
  {
    group: 'infrastructure',
    label: 'Nomad route reachable',
    phase: 'wait_for_nomad',
    messageIncludes: 'Nomad is reachable',
    progressPhases: ['wait_for_nomad'],
  },
  {
    group: 'applications',
    label: 'E2B services',
    phase: 'nomad_services_complete',
    messageIncludes: 'completed',
    progressPhases: [
      'nomad_services_plan',
      'nomad_services_plan_complete',
      'nomad_services_apply',
      'nomad_services_resource',
      'nomad_services_apply_complete',
    ],
  },
  {
    group: 'applications',
    label: 'Final infrastructure checks',
    phase: 'final_converge_complete',
    messageIncludes: 'completed',
    progressPhases: [
      'final_converge_plan',
      'final_converge_plan_complete',
      'final_converge_apply',
      'final_converge_resource',
      'final_converge_apply_complete',
    ],
  },
  {
    group: 'verification',
    label: 'Edge API healthy',
    phase: 'health_check',
    messageIncludes: 'passed',
    progressPhases: ['health_check'],
  },
  {
    group: 'verification',
    label: 'Team routing attached',
    phase: 'registering_cluster',
    messageIncludes: 'Team attached',
    progressPhases: ['registering_cluster'],
  },
  {
    group: 'verification',
    label: 'Base template built',
    phase: 'building_base_template',
    messageIncludes: ' is ready',
    progressPhases: ['building_base_template'],
  },
  {
    group: 'verification',
    label: 'Sandbox smoke passed',
    phase: 'smoke_testing',
    messageIncludes: 'Sandbox smoke passed',
    progressPhases: ['smoke_testing'],
  },
] as const

const destroyDefinitions: readonly DeploymentCheckDefinition[] = [
  workerAccessDefinition,
  {
    group: 'infrastructure',
    label: 'Terraform access verified',
    phase: 'terraform_destroy_preflight',
    messageIncludes: 'Terraform backend is ready',
  },
  {
    group: 'applications',
    label: 'Team routing detached',
    phase: 'detaching_cluster',
    messageIncludes: 'Team routing detached',
  },
  {
    group: 'verification',
    label: 'Infrastructure destroyed',
    phase: 'terraform_destroy',
    messageIncludes: 'Terraform destroy finished',
  },
] as const

const validateDefinitions: readonly DeploymentCheckDefinition[] = [
  {
    group: 'verification',
    label: 'Edge API healthy',
    phase: 'health_check',
    messageIncludes: 'passed',
  },
  {
    group: 'verification',
    label: 'Base template built',
    phase: 'building_base_template',
    messageIncludes: ' is ready',
  },
  {
    group: 'verification',
    label: 'Sandbox smoke passed',
    phase: 'smoke_testing',
    messageIncludes: 'Sandbox smoke passed',
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
    operation?.kind === 'destroy'
      ? destroyDefinitions
      : operation?.kind === 'validate'
        ? validateDefinitions
        : deployDefinitions
  if (!operation) {
    return definitions.map(({ group, label }) => ({
      group,
      label,
      message: 'Waiting for a deployment operation.',
      status: 'pending',
    }))
  }

  const startIndex = events.findLastIndex(
    (event) =>
      event.phase === 'operation_started' &&
      event.message.includes(operation.id)
  )
  const operationEvents = startIndex >= 0 ? events.slice(startIndex) : []
  const matches = definitions.map((definition) =>
    operationEvents.find(
      (event) =>
        (event.phase === definition.phase ||
          definition.alternatePhases?.includes(event.phase)) &&
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

  return definitions.map((definition, index) => {
    const { group, label } = definition
    const event = matches[index]
    if (event) {
      return {
        group,
        label,
        message: event.message,
        status: 'passed',
        timestamp: event.created_at,
      }
    }

    if (operation.status === 'succeeded') {
      return {
        group,
        label,
        message: 'Not required for this operation.',
        status: 'skipped',
      }
    }

    const isCurrent = index === firstIncomplete
    const progressEvent = isCurrent
      ? operationEvents.findLast((candidate) =>
          definition.progressPhases?.includes(candidate.phase)
        )
      : undefined
    return {
      group,
      label,
      message:
        isCurrent && failed
          ? 'The operation stopped before this check completed.'
          : isCurrent && active && startIndex >= 0
            ? (progressEvent?.message ?? 'In progress.')
            : 'Waiting for the previous check.',
      status:
        isCurrent && failed
          ? 'failed'
          : isCurrent && active && startIndex >= 0
            ? 'running'
            : 'pending',
    }
  })
}
