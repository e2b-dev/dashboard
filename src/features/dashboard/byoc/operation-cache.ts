import type { TRPCRouterOutputs } from '@/trpc/client'

type ByocOperation = TRPCRouterOutputs['byoc']['listOperations'][number]
type ByocDeployment = TRPCRouterOutputs['byoc']['listDeployments'][number]

export type OperationMutationInput = {
  deploymentId: string
  clientRequestId: string
}

export function createOptimisticOperation(
  kind: ByocOperation['kind'],
  input: OperationMutationInput,
  now = new Date()
): ByocOperation {
  const timestamp = now.toISOString()
  return {
    id: `optimistic:${input.clientRequestId}`,
    deployment_id: input.deploymentId,
    kind,
    status: 'queued',
    client_request_id: input.clientRequestId,
    dispatch_attempts: 0,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

export function upsertOperation(
  current: ByocOperation[] | undefined,
  operation: ByocOperation
) {
  return [
    operation,
    ...(current ?? []).filter(
      (item) =>
        item.id !== operation.id &&
        item.client_request_id !== operation.client_request_id
    ),
  ]
}

export function upsertDeployment(
  current: ByocDeployment[] | undefined,
  deployment: ByocDeployment
) {
  return [
    deployment,
    ...(current ?? []).filter((item) => item.id !== deployment.id),
  ]
}

export function removeOptimisticOperation(
  current: ByocOperation[] | undefined,
  clientRequestId: string
) {
  return current?.filter((item) => item.id !== `optimistic:${clientRequestId}`)
}

export function preserveOptimisticOperations(
  current: ByocOperation[] | undefined,
  incoming: ByocOperation[]
) {
  const pending = (current ?? []).filter(
    (operation) =>
      operation.id.startsWith('optimistic:') &&
      !incoming.some(
        (candidate) =>
          candidate.client_request_id === operation.client_request_id
      )
  )
  return [...pending, ...incoming]
}
