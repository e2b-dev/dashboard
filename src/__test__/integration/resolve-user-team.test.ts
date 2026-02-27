import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COOKIE_KEYS } from '@/configs/cookies'

/**
 * Integration tests for resolveUserTeam function
 *
 * This function is CRITICAL for security as it resolves which team a user should access.
 * It MUST always resolve an authorized team for the user, even if:
 * - User has cookies for a team they're not authorized to access
 * - User has no cookies at all
 * - User has invalid/stale cookies
 *
 * Test Coverage:
 * 1. Valid authorized cookies - should use cookies
 * 2. Invalid/unauthorized cookies - should fall back to DB (SECURITY CRITICAL)
 * 3. No cookies - should use default team from DB
 * 4. No cookies, no default - should use first team from DB
 * 5. No teams - should return null
 * 6. Partial cookies - should fall back to DB
 * 7. Database errors - should handle gracefully
 */

// create hoisted mocks
const { mockSupabaseAdmin, mockCookieStore, mockCheckUserTeamAuth } =
  vi.hoisted(() => ({
    mockSupabaseAdmin: {
      from: vi.fn(),
    },
    mockCookieStore: {
      get: vi.fn(),
    },
    mockCheckUserTeamAuth: vi.fn(),
  }))

vi.mock('@/lib/clients/supabase/admin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookieStore),
}))

vi.mock('@/server/auth/check-user-team-auth-cached', () => ({
  checkUserTeamAuth: mockCheckUserTeamAuth,
}))

// import after mocks are set up
import { resolveUserTeam } from '@/server/team/resolve-user-team'

describe('resolveUserTeam - Authorization Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  /**
   * Helper to setup cookie mock responses
   */
  function setupCookies(cookieValues: Record<string, string>) {
    mockCookieStore.get.mockImplementation((key: string) => {
      const value = cookieValues[key]
      return value ? { value } : undefined
    })
  }

  /**
   * Helper to setup database mock responses for users_teams query
   */
  function setupDatabaseMock(
    teams: Array<{
      team_id: string
      is_default: boolean
      team: { id: string; slug: string } | null
    }> | null,
    error: { message: string } | null = null
  ) {
    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockResolvedValue({
      data: teams,
      error,
    })

    mockSupabaseAdmin.from.mockReturnValue({
      select: selectMock,
    })

    selectMock.mockReturnValue({
      eq: eqMock,
    })

    return { selectMock, eqMock }
  }

  describe('Valid Authorized Cookies', () => {
    it('should use cookies when user is authorized for the team', async () => {
      // setup: user has valid cookies
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-456',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'my-team',
      })

      // setup: authorization check passes
      mockCheckUserTeamAuth.mockResolvedValue(true)

      // execute
      const result = await resolveUserTeam('user-123')

      // verify: authorization was checked
      expect(mockCheckUserTeamAuth).toHaveBeenCalledWith('user-123', 'team-456')

      // verify: returns team from cookies
      expect(result).toEqual({
        id: 'team-456',
        slug: 'my-team',
      })

      // verify: database was NOT queried (cookies used)
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled()
    })

    it('should use cookies for user with multiple teams', async () => {
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-secondary',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'secondary-team',
      })

      mockCheckUserTeamAuth.mockResolvedValue(true)

      const result = await resolveUserTeam('user-123')

      expect(result).toEqual({
        id: 'team-secondary',
        slug: 'secondary-team',
      })
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled()
    })
  })

  describe('Invalid/Unauthorized Cookies', () => {
    it('should fall back to database when user has cookies for unauthorized team', async () => {
      // user has cookies for a team they shouldn't access
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-unauthorized',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'unauthorized-team',
      })

      // setup: authorization check FAILS
      mockCheckUserTeamAuth.mockResolvedValue(false)

      // setup: database returns user's actual authorized teams
      setupDatabaseMock([
        {
          team_id: 'team-authorized',
          is_default: true,
          team: { id: 'team-authorized', slug: 'authorized-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // verify: authorization was checked
      expect(mockCheckUserTeamAuth).toHaveBeenCalledWith(
        'user-123',
        'team-unauthorized'
      )

      // verify: returns authorized team from DB, NOT from cookies
      expect(result).toEqual({
        id: 'team-authorized',
        slug: 'authorized-team',
      })

      // verify: database was queried (fallback)
      expect(mockSupabaseAdmin.from).toHaveBeenCalled()
    })

    it('should use first team when unauthorized cookies and no default team', async () => {
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-unauthorized',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'unauthorized-team',
      })

      mockCheckUserTeamAuth.mockResolvedValue(false)

      // no default team, but has teams
      setupDatabaseMock([
        {
          team_id: 'team-first',
          is_default: false,
          team: { id: 'team-first', slug: 'first-team' },
        },
        {
          team_id: 'team-second',
          is_default: false,
          team: { id: 'team-second', slug: 'second-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // should use first team from list
      expect(result).toEqual({
        id: 'team-first',
        slug: 'first-team',
      })
    })

    it('should return null when unauthorized cookies and no teams in DB', async () => {
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-unauthorized',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'unauthorized-team',
      })

      mockCheckUserTeamAuth.mockResolvedValue(false)

      // user has no teams
      setupDatabaseMock([])

      const result = await resolveUserTeam('user-123')

      expect(result).toBeNull()
    })
  })

  describe('No Cookies', () => {
    it('should use default team from database when no cookies exist', async () => {
      // no cookies
      setupCookies({})

      // setup: database returns teams with a default
      setupDatabaseMock([
        {
          team_id: 'team-default',
          is_default: true,
          team: { id: 'team-default', slug: 'default-team' },
        },
        {
          team_id: 'team-other',
          is_default: false,
          team: { id: 'team-other', slug: 'other-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // verify: did not check authorization (no cookies to check)
      expect(mockCheckUserTeamAuth).not.toHaveBeenCalled()

      // verify: returns default team
      expect(result).toEqual({
        id: 'team-default',
        slug: 'default-team',
      })
    })

    it('should use first team when no cookies and no default team', async () => {
      setupCookies({})

      // no default team
      setupDatabaseMock([
        {
          team_id: 'team-first',
          is_default: false,
          team: { id: 'team-first', slug: 'first-team' },
        },
        {
          team_id: 'team-second',
          is_default: false,
          team: { id: 'team-second', slug: 'second-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // should use first team from list
      expect(result).toEqual({
        id: 'team-first',
        slug: 'first-team',
      })
    })

    it('should handle team without slug (use ID instead)', async () => {
      setupCookies({})

      // team has no slug (edge case)
      setupDatabaseMock([
        {
          team_id: 'team-id-only',
          is_default: true,
          team: { id: 'team-id-only', slug: '' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // should fallback to ID when slug is empty
      expect(result).toEqual({
        id: 'team-id-only',
        slug: 'team-id-only',
      })
    })

    it('should return null when no cookies and no teams', async () => {
      setupCookies({})

      setupDatabaseMock([])

      const result = await resolveUserTeam('user-123')

      expect(result).toBeNull()
    })

    it('should return null when database returns null', async () => {
      setupCookies({})

      setupDatabaseMock(null)

      const result = await resolveUserTeam('user-123')

      expect(result).toBeNull()
    })
  })

  describe('Partial Cookies', () => {
    it('should fall back to database when only team ID cookie exists', async () => {
      // only team ID cookie, no slug
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-456',
      })

      setupDatabaseMock([
        {
          team_id: 'team-default',
          is_default: true,
          team: { id: 'team-default', slug: 'default-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // verify: did not check authorization (incomplete cookies)
      expect(mockCheckUserTeamAuth).not.toHaveBeenCalled()

      // verify: fell back to database
      expect(result).toEqual({
        id: 'team-default',
        slug: 'default-team',
      })
    })

    it('should fall back to database when only team slug cookie exists', async () => {
      // only team slug cookie, no ID
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'my-team',
      })

      setupDatabaseMock([
        {
          team_id: 'team-default',
          is_default: true,
          team: { id: 'team-default', slug: 'default-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      expect(mockCheckUserTeamAuth).not.toHaveBeenCalled()
      expect(result).toEqual({
        id: 'team-default',
        slug: 'default-team',
      })
    })
  })

  describe('Database Errors', () => {
    it('should return null when database query fails', async () => {
      setupCookies({})

      setupDatabaseMock(null, { message: 'Database connection failed' })

      const result = await resolveUserTeam('user-123')

      expect(result).toBeNull()
    })

    it('should fall back to database when authorization check fails with error', async () => {
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-456',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'my-team',
      })

      // authorization check fails (returns false on error)
      mockCheckUserTeamAuth.mockResolvedValue(false)

      setupDatabaseMock([
        {
          team_id: 'team-default',
          is_default: true,
          team: { id: 'team-default', slug: 'default-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // should still fall back to database
      expect(result).toEqual({
        id: 'team-default',
        slug: 'default-team',
      })
    })

    it('should return null when team relation is malformed', async () => {
      setupCookies({})

      // malformed data - team relation is null
      setupDatabaseMock([
        {
          team_id: 'team-123',
          is_default: true,
          team: null, // malformed!
        },
      ])

      const result = await resolveUserTeam('user-123')

      expect(result).toBeNull()
    })
  })

  describe('Complex Scenarios', () => {
    it('should prefer default team over first team when both exist', async () => {
      setupCookies({})

      setupDatabaseMock([
        {
          team_id: 'team-first',
          is_default: false,
          team: { id: 'team-first', slug: 'first-team' },
        },
        {
          team_id: 'team-default',
          is_default: true,
          team: { id: 'team-default', slug: 'default-team' },
        },
        {
          team_id: 'team-third',
          is_default: false,
          team: { id: 'team-third', slug: 'third-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // should use default team, not first team
      expect(result).toEqual({
        id: 'team-default',
        slug: 'default-team',
      })
    })

    it('should handle user switching teams correctly', async () => {
      // first call - user has cookies for team A
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-a',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'team-a-slug',
      })

      mockCheckUserTeamAuth.mockResolvedValue(true)

      let result = await resolveUserTeam('user-123')

      expect(result).toEqual({
        id: 'team-a',
        slug: 'team-a-slug',
      })

      // second call - user switches to team B
      vi.clearAllMocks()
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-b',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'team-b-slug',
      })

      mockCheckUserTeamAuth.mockResolvedValue(true)

      result = await resolveUserTeam('user-123')

      expect(result).toEqual({
        id: 'team-b',
        slug: 'team-b-slug',
      })
    })

    it('should prevent access when user loses team membership', async () => {
      // user has cookies for a team they were previously a member of
      setupCookies({
        [COOKIE_KEYS.SELECTED_TEAM_ID]: 'team-removed',
        [COOKIE_KEYS.SELECTED_TEAM_SLUG]: 'removed-team',
      })

      // authorization check fails (no longer a member)
      mockCheckUserTeamAuth.mockResolvedValue(false)

      // user has other teams
      setupDatabaseMock([
        {
          team_id: 'team-remaining',
          is_default: true,
          team: { id: 'team-remaining', slug: 'remaining-team' },
        },
      ])

      const result = await resolveUserTeam('user-123')

      // should redirect to remaining team
      expect(result).toEqual({
        id: 'team-remaining',
        slug: 'remaining-team',
      })
    })
  })
})
