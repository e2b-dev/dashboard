import { describe, expect, it } from 'vitest'
import {
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
})
