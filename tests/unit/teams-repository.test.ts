import { describe, expect, it, vi } from 'vitest'
import { createTeamsRepository } from '@/core/modules/teams/teams-repository.server'

describe('createTeamsRepository', () => {
  it('returns a repo error instead of throwing when a team-scoped method has no teamId', async () => {
    const repository = createTeamsRepository(
      { accessToken: 'token' },
      {
        apiClient: {
          POST: vi.fn(),
          GET: vi.fn(),
          PATCH: vi.fn(),
          DELETE: vi.fn(),
        } as unknown as typeof import('@/core/shared/clients/api').api,
        authHeaders: vi.fn(() => ({ Authorization: 'Bearer token' })),
      }
    )

    await expect(repository.updateTeamName('new name')).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'internal',
        status: 500,
        message: 'teamId is required for team-scoped repository operation',
      }),
    })
  })
})
