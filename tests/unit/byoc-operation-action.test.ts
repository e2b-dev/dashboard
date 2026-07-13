import { describe, expect, it } from 'vitest'
import {
  recommendedByocOperation,
  recommendedByocOperationLabel,
} from '@/features/dashboard/byoc/operation-action'

describe('recommended BYOC operation', () => {
  it.each([
    ['initial deployment', undefined, false, undefined, 'deploy'],
    ['attached validation', 'cluster-1', false, undefined, 'validate'],
    ['topology update', 'cluster-1', true, undefined, 'deploy'],
    [
      'retryable validation failure',
      'cluster-1',
      false,
      { kind: 'validate', status: 'failed_retryable' },
      'validate',
    ],
    [
      'terminal validation failure',
      'cluster-1',
      false,
      { kind: 'validate', status: 'failed_terminal' },
      'deploy',
    ],
  ] as const)('%s selects %s', (_name, clusterId, topologyDirty, latestOperation, expected) => {
    expect(
      recommendedByocOperation({
        clusterId,
        deploymentStatus: clusterId ? 'attached' : 'draft',
        latestOperation,
        topologyDirty,
      })
    ).toBe(expected)
  })

  it('labels failed attached validation separately from infrastructure retry', () => {
    expect(
      recommendedByocOperationLabel({
        clusterId: 'cluster-1',
        deploymentStatus: 'failed',
        latestOperation: { kind: 'validate', status: 'failed_retryable' },
        topologyDirty: false,
      })
    ).toBe('Retry validation')
    expect(
      recommendedByocOperationLabel({
        clusterId: 'cluster-1',
        deploymentStatus: 'failed',
        latestOperation: { kind: 'validate', status: 'failed_terminal' },
        topologyDirty: false,
      })
    ).toBe('Retry deployment')
  })
})
