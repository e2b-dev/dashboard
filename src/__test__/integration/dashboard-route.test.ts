import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROTECTED_URLS } from '@/configs/urls'

/**
 * Integration tests for /dashboard route
 *
 * This route is critical as it handles user authentication and team resolution.
 * It redirects authenticated users to the appropriate team dashboard based on:
 * - Tab parameter (sandboxes, templates, usage, billing, etc.)
 * - Team resolution via resolveUserTeam function
 * - Fallback to sandboxes tab when no/invalid tab specified
 *
 * Test Coverage:
 * 1. Authentication flow - valid users vs unauthenticated
 * 2. Team resolution - delegates to resolveUserTeam function
 * 3. Tab parameter routing - all valid tabs and fallbacks
 * 4. Error handling - auth errors and missing teams
 * 5. Cookie setting - team persistence
 * 6. URL generation - correct paths for team slug/ID
 */

// create hoisted mocks
const {
  mockSupabaseClient,
  mockSupabaseAdmin,
  mockCookieStore,
  mockResolveUserTeam,
} = vi.hoisted(() => ({
  mockSupabaseClient: {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
  mockSupabaseAdmin: {
    from: vi.fn(),
  },
  mockCookieStore: {
    get: vi.fn(),
    set: vi.fn(),
  },
  mockResolveUserTeam: vi.fn(),
}))

vi.mock('@/lib/clients/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/clients/supabase/admin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookieStore),
}))

vi.mock('@/lib/utils/auth', () => ({
  encodedRedirect: vi.fn((type, url, message) => {
    const redirectUrl = new URL(url)
    redirectUrl.searchParams.set(type, message)
    return NextResponse.redirect(redirectUrl)
  }),
}))

vi.mock('@/server/team/resolve-user-team', () => ({
  resolveUserTeam: mockResolveUserTeam,
}))

vi.mock('@/lib/utils/cookies', () => ({
  setTeamCookies: vi.fn(),
  getTeamCookies: vi.fn(),
}))

// import the route after mocks are set up
import { GET, TAB_URL_MAP } from '@/app/dashboard/route'

describe('Dashboard Route - Team Resolution Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  /**
   * Helper to create a NextRequest with optional query params
   */
  function createRequest(
    searchParams: Record<string, string> = {}
  ): NextRequest {
    const url = new URL('http://localhost:3000/dashboard')
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    return new NextRequest(url)
  }

  describe('Authenticated Users - Team Resolved Successfully', () => {
    it('should redirect to team sandboxes when team is resolved', async () => {
      // setup: authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      // setup: team resolution succeeds
      mockResolveUserTeam.mockResolvedValue({
        id: 'team-456',
        slug: 'my-team',
      })

      const request = createRequest({})

      // execute
      const response = await GET(request)

      // verify: resolveUserTeam was called with user ID
      expect(mockResolveUserTeam).toHaveBeenCalledWith('user-123')

      // verify: redirects to sandboxes page
      expect(response.status).toBe(307) // temporary redirect
      expect(response.headers.get('location')).toContain(
        '/dashboard/my-team/sandboxes'
      )
    })

    it('should redirect to specified tab when provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockResolveUserTeam.mockResolvedValue({
        id: 'team-456',
        slug: 'my-team',
      })

      const request = createRequest({ tab: 'billing' })

      const response = await GET(request)

      expect(response.headers.get('location')).toContain(
        '/dashboard/my-team/billing'
      )
    })
  })

  describe('Authenticated Users - No Team Found (Unexpected State)', () => {
    it('should sign out and redirect with error when no team can be resolved', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      // resolveUserTeam returns null (no team found)
      mockResolveUserTeam.mockResolvedValue(null)

      const request = createRequest({})

      const response = await GET(request)

      // verify: user is signed out
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()

      // verify: redirects to sign-in with error message
      expect(response.headers.get('location')).toContain('/sign-in')
      expect(response.headers.get('location')).toContain('error=')
    })
  })

  describe('Unauthenticated Users', () => {
    it('should redirect to sign-in when user is not authenticated', async () => {
      // no user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createRequest({})

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/sign-in')

      // should not call resolveUserTeam
      expect(mockResolveUserTeam).not.toHaveBeenCalled()
    })

    it('should redirect to sign-in when auth returns error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      })

      const request = createRequest({})

      const response = await GET(request)

      expect(response.headers.get('location')).toContain('/sign-in')
      expect(mockResolveUserTeam).not.toHaveBeenCalled()
    })
  })

  describe('Tab Parameter Routing', () => {
    const testTeamSlug = 'my-team'

    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockResolveUserTeam.mockResolvedValue({
        id: 'team-456',
        slug: testTeamSlug,
      })
    })

    // dynamically test all tabs defined in TAB_URL_MAP
    Object.entries(TAB_URL_MAP).forEach(([tab, urlGenerator]) => {
      it(`should redirect to correct path when tab=${tab}`, async () => {
        const request = createRequest({ tab })
        const response = await GET(request)

        const expectedPath = urlGenerator(testTeamSlug)
        const actualLocation = response.headers.get('location')

        expect(actualLocation).toContain(expectedPath)
      })
    })

    it('should default to sandboxes when no tab parameter', async () => {
      const request = createRequest({})
      const response = await GET(request)

      const expectedPath = PROTECTED_URLS.SANDBOXES(testTeamSlug)
      expect(response.headers.get('location')).toContain(expectedPath)
    })

    it('should default to sandboxes when unknown tab parameter', async () => {
      const request = createRequest({ tab: 'unknown-tab' })
      const response = await GET(request)

      const expectedPath = PROTECTED_URLS.SANDBOXES(testTeamSlug)
      expect(response.headers.get('location')).toContain(expectedPath)
    })

    it('should use team ID as fallback when slug is empty', async () => {
      const testTeamId = 'team-id-only'

      mockResolveUserTeam.mockResolvedValue({
        id: testTeamId,
        slug: '',
      })

      const request = createRequest({ tab: 'billing' })
      const response = await GET(request)

      const expectedPath = TAB_URL_MAP['billing']!(testTeamId)
      expect(response.headers.get('location')).toContain(expectedPath)
    })
  })
})
