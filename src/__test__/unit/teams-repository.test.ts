import { describe, expect, it, vi } from 'vitest'
import type { components as DashboardComponents } from '@/contracts/dashboard-api'
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

describe('createTeamsRepository', () => {
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

    const repository = createTeamsRepository(
      { accessToken: 'token' },
      {
        apiClient:
          apiClient as unknown as typeof import('@/core/shared/clients/api').api,
        authHeaders: vi.fn(() => ({ 'X-Supabase-Token': 'token' })),
        adminClient: {
          auth: { admin: { getUserById: vi.fn() } },
        } as unknown as typeof import('@/core/shared/clients/supabase/admin').supabaseAdmin,
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
