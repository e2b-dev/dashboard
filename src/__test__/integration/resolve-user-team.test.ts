import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COOKIE_KEYS } from '@/configs/cookies'

const {
  mockCookieStore,
  mockListUserTeams,
  mockBootstrapUser,
  mockResolveTeamBySlug,
  mockCreateUserTeamsRepository,
  mockCreateAdminUsersRepository,
} = vi.hoisted(() => ({
  mockCookieStore: {
    get: vi.fn(),
  },
  mockListUserTeams: vi.fn(),
  mockBootstrapUser: vi.fn(),
  mockResolveTeamBySlug: vi.fn(),
  mockCreateUserTeamsRepository: vi.fn(),
  mockCreateAdminUsersRepository: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookieStore),
}))

vi.mock('@/core/modules/teams/user-teams-repository.server', () => ({
  createUserTeamsRepository: mockCreateUserTeamsRepository,
}))

vi.mock('@/core/modules/users/admin-repository.server', () => ({
  createAdminUsersRepository: mockCreateAdminUsersRepository,
}))

import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'

const TEST_USER_ID = 'user-123'
const TEST_ACCESS_TOKEN = 'access-token'

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
      resolveTeamBySlug: mockResolveTeamBySlug,
    })
    mockCreateAdminUsersRepository.mockReturnValue({
      bootstrapUser: mockBootstrapUser,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns the cookie-backed team when the cookie slug resolves', async () => {
    setupCookies({
      [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-cookie-id',
      [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'team-cookie-slug',
    })
    mockResolveTeamBySlug.mockResolvedValue({
      ok: true,
      data: {
        id: 'team-cookie-id',
        slug: 'team-cookie-slug',
      },
    })

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toEqual({
      id: 'team-cookie-id',
      slug: 'team-cookie-slug',
    })
    expect(mockResolveTeamBySlug).toHaveBeenCalledWith('team-cookie-slug')
    expect(mockListUserTeams).not.toHaveBeenCalled()
  })

  it('returns the resolved team when the cookie id is stale but the slug is valid', async () => {
    setupCookies({
      [COOKIE_KEYS.SELECTED_TEAM_ID]: 'stale-team-id',
      [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'team-cookie-slug',
    })
    mockResolveTeamBySlug.mockResolvedValue({
      ok: true,
      data: {
        id: 'team-cookie-id',
        slug: 'team-cookie-slug',
      },
    })

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toEqual({
      id: 'team-cookie-id',
      slug: 'team-cookie-slug',
    })
    expect(mockListUserTeams).not.toHaveBeenCalled()
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

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toEqual({
      id: 'team-b',
      slug: 'team-b',
    })
    expect(mockCreateUserTeamsRepository).toHaveBeenCalledWith({
      accessToken: TEST_ACCESS_TOKEN,
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

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toEqual({
      id: 'team-slugged',
      slug: 'team-slugged',
    })
  })

  it('falls back to the repository when the cookie slug is no longer accessible', async () => {
    setupCookies({
      [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-cookie-id',
      [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'team-cookie-slug',
    })
    mockResolveTeamBySlug.mockResolvedValue({
      ok: false,
      error: new Error('Team not found'),
    })
    mockListUserTeams.mockResolvedValue({
      ok: true,
      data: [createTeam({ id: 'team-db', slug: 'team-db', isDefault: true })],
    })

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toEqual({
      id: 'team-db',
      slug: 'team-db',
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

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toEqual({
      id: 'team-db',
      slug: 'team-db',
    })
    expect(mockResolveTeamBySlug).not.toHaveBeenCalled()
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

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toBeNull()
  })

  it('bootstraps once when the user has no teams', async () => {
    setupCookies({})
    mockListUserTeams.mockResolvedValue({
      ok: true,
      data: [],
    })
    mockBootstrapUser.mockResolvedValue({
      ok: true,
      data: {
        id: 'bootstrapped-team',
        slug: 'bootstrapped-team',
      },
    })

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toEqual({
      id: 'bootstrapped-team',
      slug: 'bootstrapped-team',
    })
    expect(mockCreateAdminUsersRepository).toHaveBeenCalledTimes(1)
    expect(mockBootstrapUser).toHaveBeenCalledTimes(1)
    expect(mockBootstrapUser).toHaveBeenCalledWith(TEST_USER_ID)
  })

  it('returns null when bootstrap fails after empty team lookup', async () => {
    setupCookies({})
    mockListUserTeams.mockResolvedValue({
      ok: true,
      data: [],
    })
    mockBootstrapUser.mockResolvedValue({
      ok: false,
      error: new Error('Failed to bootstrap user'),
    })

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toBeNull()
    expect(mockCreateAdminUsersRepository).toHaveBeenCalledTimes(1)
    expect(mockBootstrapUser).toHaveBeenCalledTimes(1)
    expect(mockBootstrapUser).toHaveBeenCalledWith(TEST_USER_ID)
  })

  it('returns null when listing teams fails', async () => {
    setupCookies({})
    mockListUserTeams.mockResolvedValue({
      ok: false,
      error: new Error('Failed to fetch user teams'),
    })

    const result = await resolveUserTeam(TEST_USER_ID, TEST_ACCESS_TOKEN)

    expect(result).toBeNull()
    expect(mockBootstrapUser).not.toHaveBeenCalled()
  })
})
