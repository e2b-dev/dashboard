import { describe, expect, it, vi } from 'vitest'
import type { components as DashboardComponents } from '@/contracts/dashboard-api'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'

function createApiResponse<T>(input: {
  ok: boolean
  status: number
  data?: T
  error?: { message?: string } | null
}) {
  return {
    data: input.data,
    error: input.error ?? null,
    response: {
      ok: input.ok,
      status: input.status,
    },
  }
}

describe('createUserTeamsRepository', () => {
  it('returns a validation repo error when createTeam gets a 400 response', async () => {
    const apiClient = {
      POST: vi.fn().mockResolvedValue(
        createApiResponse<
          DashboardComponents['schemas']['TeamResolveResponse']
        >({
          ok: false,
          status: 400,
          error: { message: 'Team name is invalid' },
        })
      ),
      GET: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    }

    const repository = createUserTeamsRepository(
      { accessToken: 'token' },
      {
        apiClient:
          apiClient as unknown as typeof import('@/core/shared/clients/api').api,
        authHeaders: vi.fn(() => ({ 'X-Supabase-Token': 'token' })),
      }
    )

    const result = await repository.createTeam('bad name')

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'validation',
        status: 400,
        message: 'Team name is invalid',
      }),
    })
  })
})
