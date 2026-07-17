import { describe, expect, it } from 'vitest'
import {
  createOptimisticOperation,
  preserveOptimisticOperations,
  removeOptimisticOperation,
  upsertDeployment,
  upsertOperation,
} from '@/features/dashboard/byoc/operation-cache'

describe('BYOC operation cache', () => {
  const input = {
    deploymentId: '11111111-1111-4111-8111-111111111111',
    clientRequestId: '22222222-2222-4222-8222-222222222222',
  }

  it('shows a queued operation immediately', () => {
    const operation = createOptimisticOperation(
      'deploy',
      input,
      new Date('2026-07-14T20:00:00Z')
    )

    expect(operation).toMatchObject({
      id: `optimistic:${input.clientRequestId}`,
      deployment_id: input.deploymentId,
      kind: 'deploy',
      status: 'queued',
      client_request_id: input.clientRequestId,
      created_at: '2026-07-14T20:00:00.000Z',
    })
  })

  it('replaces the optimistic operation with the durable operation', () => {
    const optimistic = createOptimisticOperation('deploy', input)
    const durable = {
      ...optimistic,
      id: '33333333-3333-4333-8333-333333333333',
      status: 'starting' as const,
    }

    expect(upsertOperation([optimistic], durable)).toEqual([durable])
  })

  it('removes only the failed optimistic operation', () => {
    const optimistic = createOptimisticOperation('deploy', input)
    const prior = {
      ...optimistic,
      id: '44444444-4444-4444-8444-444444444444',
      client_request_id: '55555555-5555-4555-8555-555555555555',
      status: 'succeeded' as const,
    }

    expect(
      removeOptimisticOperation([optimistic, prior], input.clientRequestId)
    ).toEqual([prior])
  })

  it('does not remove a durable operation for the failed request', () => {
    const optimistic = createOptimisticOperation('deploy', input)
    const durable = {
      ...optimistic,
      id: '33333333-3333-4333-8333-333333333333',
      status: 'starting' as const,
    }

    expect(
      removeOptimisticOperation([optimistic, durable], input.clientRequestId)
    ).toEqual([durable])
  })

  it('preserves a pending operation across a stale list response', () => {
    const optimistic = createOptimisticOperation('deploy', input)

    expect(preserveOptimisticOperations([optimistic], [])).toEqual([optimistic])
  })

  it('replaces a pending operation when the durable row arrives', () => {
    const optimistic = createOptimisticOperation('deploy', input)
    const durable = {
      ...optimistic,
      id: '33333333-3333-4333-8333-333333333333',
      status: 'starting' as const,
    }

    expect(preserveOptimisticOperations([optimistic], [durable])).toEqual([
      durable,
    ])
  })

  it('seeds a newly created deployment before background refresh', () => {
    const prior = { id: 'deployment-1' }
    const created = { id: 'deployment-2' }

    expect(
      upsertDeployment([prior, { id: created.id }], created as never)
    ).toEqual([created, prior])
  })
})
