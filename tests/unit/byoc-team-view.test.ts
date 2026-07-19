import { describe, expect, it } from 'vitest'
import {
  canExecuteRetryTeamViewAction,
  findRetryTeamViewAction,
  findTeamViewAction,
} from '@/features/dashboard/byoc/team-view'

describe('backend-owned BYOC actions', () => {
  it('preserves disabled terminal actions', () => {
    expect(
      findTeamViewAction(
        {
          actions: [
            { id: 'retry_deploy', label: 'Retry deployment', enabled: false },
          ],
        },
        'retry_deploy'
      )
    ).toEqual({
      id: 'retry_deploy',
      label: 'Retry deployment',
      enabled: false,
    })
  })

  it('selects the backend retry operation without inferring from local state', () => {
    expect(
      findRetryTeamViewAction({
        actions: [
          { id: 'refresh', label: 'Refresh', enabled: true },
          { id: 'retry_destroy', label: 'Retry destroy', enabled: true },
        ],
      })
    ).toMatchObject({ id: 'retry_destroy' })
  })

  it('does not invent actions omitted by the backend', () => {
    expect(findTeamViewAction({ actions: [] }, 'retry')).toBeUndefined()
  })

  it('keeps legacy v1 retries executable during a mixed rollout', () => {
    expect(
      canExecuteRetryTeamViewAction({
        version: 1,
        actions: [
          { id: 'retry_destroy', label: 'Retry destroy', enabled: true },
        ],
      })
    ).toBe(true)
  })

  it('requires an exact operation ID for v2 retries', () => {
    expect(
      canExecuteRetryTeamViewAction({
        version: 2,
        actions: [{ id: 'retry_operation', label: 'Retry', enabled: true }],
      })
    ).toBe(false)
    expect(
      canExecuteRetryTeamViewAction({
        version: 2,
        actions: [
          {
            id: 'retry_operation',
            label: 'Retry',
            enabled: true,
            operation_id: '55555555-5555-4555-8555-555555555555',
          },
        ],
      })
    ).toBe(true)
  })
})
