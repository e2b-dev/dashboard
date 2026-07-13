type DeploymentActionState = {
  clusterId?: string
  deploymentStatus: string
  latestOperation?: {
    kind: string
    status: string
  }
  topologyDirty: boolean
}

export function recommendedByocOperation({
  clusterId,
  latestOperation,
  topologyDirty,
}: DeploymentActionState): 'deploy' | 'validate' {
  const terminalValidationFailure =
    latestOperation?.kind === 'validate' &&
    latestOperation.status === 'failed_terminal'
  return clusterId && !topologyDirty && !terminalValidationFailure
    ? 'validate'
    : 'deploy'
}

export function recommendedByocOperationLabel(
  state: DeploymentActionState
): string {
  if (state.deploymentStatus === 'attached') {
    return state.topologyDirty ? 'Apply changes' : 'Validate'
  }
  if (state.deploymentStatus === 'failed') {
    return recommendedByocOperation(state) === 'validate'
      ? 'Retry validation'
      : 'Retry deployment'
  }
  return 'Deploy'
}
