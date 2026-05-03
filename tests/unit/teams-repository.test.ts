import { describe, expect, it, vi } from 'vitest'
import { createTeamsRepository } from '@/core/modules/teams/teams-repository.server'

vi.mock('@/core/shared/clients/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  },
}))

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
        authHeaders: vi.fn(() => ({ 'X-Supabase-Token': 'token' })),
        adminClient: {
          auth: { admin: { getUserById: vi.fn() } },
        } as unknown as typeof import('@/core/shared/clients/supabase/admin').supabaseAdmin,
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
