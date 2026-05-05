import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRepoError } from '@/core/shared/errors'

const { mockResolveTeamBySlug, mockCreateUserTeamsRepository } = vi.hoisted(
  () => ({
    mockResolveTeamBySlug: vi.fn(),
    mockCreateUserTeamsRepository: vi.fn(),
  })
)

vi.mock('@/core/modules/teams/user-teams-repository.server', () => ({
  createUserTeamsRepository: mockCreateUserTeamsRepository,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'

describe('getTeamIdFromSlug', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCreateUserTeamsRepository.mockReturnValue({
      resolveTeamBySlug: mockResolveTeamBySlug,
    })
  })

  it('returns the resolved team id when the slug is accessible', async () => {
    mockResolveTeamBySlug.mockResolvedValue({
      ok: true,
      data: {
        id: 'team-123',
        slug: 'acme',
      },
    })

    const result = await getTeamIdFromSlug('acme', 'access-token')

    expect(result).toEqual({
      ok: true,
      data: 'team-123',
    })
  })

  it('returns null when the slug is invalid', async () => {
    const result = await getTeamIdFromSlug('', 'access-token')

    expect(result).toEqual({
      ok: true,
      data: null,
    })
    expect(mockResolveTeamBySlug).not.toHaveBeenCalled()
  })

  it('returns null when the team is not found', async () => {
    mockResolveTeamBySlug.mockResolvedValue({
      ok: false,
      error: createRepoError({
        code: 'not_found',
        status: 404,
        message: 'Team not found',
      }),
    })

    const result = await getTeamIdFromSlug('acme', 'access-token')

    expect(result).toEqual({
      ok: true,
      data: null,
    })
  })

  it('returns null when the team is forbidden', async () => {
    mockResolveTeamBySlug.mockResolvedValue({
      ok: false,
      error: createRepoError({
        code: 'forbidden',
        status: 403,
        message: 'Forbidden',
      }),
    })

    const result = await getTeamIdFromSlug('acme', 'access-token')

    expect(result).toEqual({
      ok: true,
      data: null,
    })
  })

  it('bubbles unauthorized repository errors', async () => {
    const error = createRepoError({
      code: 'unauthorized',
      status: 401,
      message: 'Unauthorized',
    })

    mockResolveTeamBySlug.mockResolvedValue({
      ok: false,
      error,
    })

    const result = await getTeamIdFromSlug('acme', 'access-token')

    expect(result).toEqual({
      ok: false,
      error,
    })
  })

  it('bubbles unavailable repository errors', async () => {
    const error = createRepoError({
      code: 'unavailable',
      status: 500,
      message: 'Failed to resolve team',
    })

    mockResolveTeamBySlug.mockResolvedValue({
      ok: false,
      error,
    })

    const result = await getTeamIdFromSlug('acme', 'access-token')

    expect(result).toEqual({
      ok: false,
      error,
    })
  })
})
