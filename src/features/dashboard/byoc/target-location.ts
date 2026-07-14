export function targetLocationChangeLocked(
  connections: readonly unknown[] | undefined,
  deployments: readonly { status: string }[] | undefined
) {
  if (!connections || !deployments) return true
  return (
    connections.length > 0 ||
    deployments.some((deployment) => deployment.status !== 'destroyed')
  )
}

export function resolvedTargetLocation<T>(
  immutableLocation: T | undefined,
  selectedLocation: T | undefined,
  allocatedLocation: T | undefined,
  hasAllocatedTarget: boolean
) {
  return (
    immutableLocation ??
    (hasAllocatedTarget
      ? allocatedLocation
      : (selectedLocation ?? allocatedLocation))
  )
}
