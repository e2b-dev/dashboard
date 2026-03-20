import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COOKIE_KEYS } from '@/configs/cookies'

const { mockCookieStore, mockListUserTeams, mockCreateUserTeamsRepository } =
  vi.hoisted(() => ({
    mockCookieStore: {
      get: vi.fn(),
    },
    mockListUserTeams: vi.fn(),
    mockCreateUserTeamsRepository: vi.fn(),
  }))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookieStore),
}))

vi.mock('@/core/modules/teams/user-teams-repository.server', () => ({
  createUserTeamsRepository: mockCreateUserTeamsRepository,
}))

import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'

function setupCookies(cookieValues: Record<string, string | undefined>) {
  mockCookieStore.get.mockImplementation((key: string) => {
    const value = cookieValues[key]
    return typeof value === 'string' ? { value } : undefined
  })
}

function createTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 'team-1',
    slug: 'team-one',
    isDefault: false,
    name: 'Team One',
    email: 'team-one@example.com',
    ...overrides,
  }
}

describe('resolveUserTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateUserTeamsRepository.mockReturnValue({
      listUserTeams: mockListUserTeams,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns the cookie-backed team when both cookies exist', async () => {
    setupCookies({
      [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-cookie-id',
      [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'team-cookie-slug',
    })

    const result = await resolveUserTeam('access-token')

    expect(result).toEqual({
      id: 'team-cookie-id',
      slug: 'team-cookie-slug',
    })
    expect(mockCreateUserTeamsRepository).not.toHaveBeenCalled()
  })

  it('returns the default slug-backed team when cookies are missing', async () => {
    setupCookies({})
    mockListUserTeams.mockResolvedValue({
      ok: true,
      data: [
        createTeam({ id: 'team-a', slug: 'team-a' }),
        createTeam({ id: 'team-b', slug: 'team-b', isDefault: true }),
      ],
    })

    const result = await resolveUserTeam('access-token')

    expect(result).toEqual({
      id: 'team-b',
      slug: 'team-b',
    })
    expect(mockCreateUserTeamsRepository).toHaveBeenCalledWith({
      accessToken: 'access-token',
    })
  })

  it('falls back to the first slug-backed team when the default has no slug', async () => {
    setupCookies({})
    mockListUserTeams.mockResolvedValue({
      ok: true,
      data: [
        createTeam({ id: 'team-default', slug: '', isDefault: true }),
        createTeam({ id: 'team-slugged', slug: 'team-slugged' }),
      ],
    })

    const result = await resolveUserTeam('access-token')

    expect(result).toEqual({
      id: 'team-slugged',
      slug: 'team-slugged',
    })
  })

  it('falls back to the repository when cookies are partial', async () => {
    setupCookies({
      [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-cookie-id',
    })
    mockListUserTeams.mockResolvedValue({
      ok: true,
      data: [createTeam({ id: 'team-db', slug: 'team-db', isDefault: true })],
    })

    const result = await resolveUserTeam('access-token')

    expect(result).toEqual({
      id: 'team-db',
      slug: 'team-db',
    })
  })

  it('returns null when no slug-backed team can be resolved', async () => {
    setupCookies({})
    mockListUserTeams.mockResolvedValue({
      ok: true,
      data: [
        createTeam({ id: 'team-a', slug: '', isDefault: true }),
        createTeam({ id: 'team-b', slug: '' }),
      ],
    })

    const result = await resolveUserTeam('access-token')

    expect(result).toBeNull()
  })

  it('returns null when listing teams fails', async () => {
    setupCookies({})
    mockListUserTeams.mockResolvedValue({
      ok: false,
      error: new Error('Failed to fetch user teams'),
    })

    const result = await resolveUserTeam('access-token')

    expect(result).toBeNull()
  })
})
