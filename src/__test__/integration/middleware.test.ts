import { COOKIE_KEYS } from '@/configs/keys'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { kv } from '@/lib/clients/kv'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { checkUserTeamAuthorization } from '@/lib/utils/server'
import { middleware } from '@/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// MOCKS SETUP
// These mocks replace actual implementations with test doubles
// to isolate the middleware functionality from external dependencies
vi.mock('@/lib/utils/server', () => ({
  checkUserTeamAuthorization: vi.fn(),
  resolveTeamId: vi.fn((id) => Promise.resolve(id)),
}))

vi.mock('@/lib/clients/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

vi.mock('@/lib/clients/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}))

// Mock NextResponse to track redirects and response modifications
vi.mock('next/server', async () => {
  const actual =
    await vi.importActual<typeof import('next/server')>('next/server')

  const mockRedirect = vi.fn((url: URL | string) => {
    const response = new actual.NextResponse(null, {
      status: 307,
      headers: {
        location: url.toString(),
      },
    })

    Object.defineProperty(response, 'cookies', {
      value: {
        set: vi.fn(),
        get: vi.fn(),
      },
      writable: true,
    })

    return response
  })

  const mockNext = vi.fn(() => {
    const response = new actual.NextResponse()

    Object.defineProperty(response, 'cookies', {
      value: {
        set: vi.fn(),
      },
      writable: true,
    })

    return response
  })

  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: mockRedirect,
      next: mockNext,
    },
  }
})

/**
 * Helper function to create mock requests with configurable properties
 * This simplifies test setup and makes tests more readable
 */
function createMockRequest({
  url = 'https://app.e2b.dev',
  path = '/',
  cookies = {},
  headers = {},
}: {
  url?: string
  path?: string
  cookies?: Record<string, string>
  headers?: Record<string, string>
} = {}): NextRequest {
  const fullUrl = `${url}${path}`

  const req = new NextRequest(fullUrl, {
    headers: new Headers(headers),
  })

  Object.entries(cookies).forEach(([key, value]) => {
    vi.spyOn(req.cookies, 'get').mockImplementation((name) => {
      if (name === key) {
        return { name, value } as { name: string; value: string }
      }
      return undefined
    })
  })

  return req
}

describe('Middleware Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Default mock: authenticated user with ID 'user-123'
    vi.mocked(createServerClient).mockImplementation(
      () =>
        ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'user-123' } },
              error: null,
            }),
          },
        }) as unknown as ReturnType<typeof createServerClient>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Authentication Flow', () => {
    /**
     * SECURITY TEST: Verifies that unauthenticated users are redirected to sign-in
     * This is a critical security test to ensure protected routes are not accessible
     * without authentication
     */
    it('redirects unauthenticated users to sign in', async () => {
      // Setup: Create an unauthenticated user scenario
      vi.mocked(createServerClient).mockImplementation(
        () =>
          ({
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: null },
                error: { message: 'Not authenticated' },
              }),
            },
          }) as unknown as ReturnType<typeof createServerClient>
      )

      const request = createMockRequest({
        path: PROTECTED_URLS.DASHBOARD,
      })

      // Execute: Run the middleware with the unauthenticated request
      await middleware(request)

      // Verify: Check that a redirect to sign-in page occurred
      const redirectCalls = vi.mocked(NextResponse.redirect).mock.calls
      expect(redirectCalls.length).toBeGreaterThan(0)

      if (redirectCalls.length > 0) {
        const redirectUrl = redirectCalls[0]?.[0]?.toString()
        expect(redirectUrl).toContain(AUTH_URLS.SIGN_IN)
      }
    })

    /**
     * USER FLOW TEST: Verifies that authenticated users can access protected routes
     * and are redirected to their default team
     */
    it('allows authenticated users to access protected routes', async () => {
      const request = createMockRequest({
        path: PROTECTED_URLS.DASHBOARD,
      })

      // Setup: Mock team data for the authenticated user
      vi.mocked(supabaseAdmin.from).mockImplementation(
        () =>
          ({
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      team_id: 'default-team-id',
                      is_default: true,
                      team: { slug: 'default-team' },
                    },
                  ],
                  error: null,
                })
              ),
            })),
          }) as unknown as ReturnType<typeof supabaseAdmin.from>
      )

      // Execute: Run the middleware with the authenticated request
      await middleware(request)

      // Verify: Check that user is redirected to their default team
      const redirectCalls = vi.mocked(NextResponse.redirect).mock.calls
      expect(redirectCalls.length).toBeGreaterThan(0)
      if (redirectCalls.length > 0) {
        expect(redirectCalls[0]?.[0]?.toString()).toContain('default-team')
      }
    })
  })

  describe('Team Access Control', () => {
    /**
     * SECURITY TEST: Verifies that users cannot access teams they don't have permission for
     * by tampering with cookies
     */
    it('handles tampered team cookies securely', async () => {
      // Setup: Create a request with tampered team ID in cookies
      const request = createMockRequest({
        path: '/dashboard/tampered-team-id/sandboxes',
        cookies: {
          [COOKIE_KEYS.SELECTED_TEAM_ID]: 'tampered-team-id',
        },
      })

      // Setup: User has no access to the tampered team
      vi.mocked(checkUserTeamAuthorization).mockResolvedValue(false)

      // Execute: Run the middleware with the tampered request
      await middleware(request)

      // Verify: User is redirected away from the tampered team
      const redirectCalls = vi.mocked(NextResponse.redirect).mock.calls
      expect(redirectCalls.length).toBeGreaterThan(0)
      if (redirectCalls.length > 0) {
        const url = redirectCalls[0]?.[0]?.toString()
        expect(url).toContain(PROTECTED_URLS.DASHBOARD)
        expect(url).not.toContain('tampered-team-id')
      }
    })

    /**
     * PERFORMANCE TEST: Verifies that team access checks use the cache when available
     * to improve performance and reduce database load
     */
    it('uses cached team access when available', async () => {
      // Setup: Create a request for a team with cached access
      const request = createMockRequest({
        path: '/dashboard/cached-team-id/sandboxes',
      })

      // Setup: Mock cached access value
      vi.mocked(kv.get).mockImplementation((key: string) => {
        if (key.includes('user-123') && key.includes('cached-team-id')) {
          return Promise.resolve(true)
        }
        return Promise.resolve(null)
      })

      // Execute: Run the middleware with the request
      await middleware(request)

      // Verify: Database check was skipped due to cache hit
      expect(checkUserTeamAuthorization).not.toHaveBeenCalled()
    })
  })

  describe('Team Resolution and Routing', () => {
    /**
     * USER FLOW TEST: Verifies that users are redirected to their default team
     * when accessing the dashboard without specifying a team
     */
    it('redirects to default team when no team is specified', async () => {
      // Setup: Create a request to the dashboard without a team
      const request = createMockRequest({
        path: PROTECTED_URLS.DASHBOARD,
      })

      // Setup: Mock teams data with a default team
      vi.mocked(supabaseAdmin.from).mockImplementation(
        () =>
          ({
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      team_id: 'default-team-id',
                      is_default: true,
                      team: { slug: 'default-team' },
                    },
                  ] as Array<{
                    team_id: string
                    is_default: boolean
                    team: { slug: string }
                  }>,
                  error: null,
                })
              ),
            })),
          }) as unknown as ReturnType<typeof supabaseAdmin.from>
      )

      // Execute: Run the middleware with the request
      await middleware(request)

      // Verify: User is redirected to their default team
      const redirectCalls = vi.mocked(NextResponse.redirect).mock.calls
      expect(redirectCalls.length).toBeGreaterThan(0)
      if (redirectCalls.length > 0) {
        expect(redirectCalls[0]?.[0]?.toString()).toContain('default-team')
      }
    })

    /**
     * USER FLOW TEST: Verifies that new users without teams are redirected
     * to the team creation page
     */
    it('redirects to new team page when user has no teams', async () => {
      // Setup: Create a request to the dashboard
      const request = createMockRequest({
        path: PROTECTED_URLS.DASHBOARD,
      })

      // Setup: Mock no teams for this user
      vi.mocked(supabaseAdmin.from).mockImplementation(
        () =>
          ({
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [] as Array<never>,
                  error: null,
                })
              ),
            })),
          }) as unknown as ReturnType<typeof supabaseAdmin.from>
      )

      // Execute: Run the middleware with the request
      await middleware(request)

      // Verify: User is redirected to the new team page
      const redirectCalls = vi.mocked(NextResponse.redirect).mock.calls
      expect(redirectCalls.length).toBeGreaterThan(0)
      if (redirectCalls.length > 0) {
        expect(redirectCalls[0]?.[0]?.toString()).toContain(
          PROTECTED_URLS.NEW_TEAM
        )
      }
    })
  })

  describe('Error Handling', () => {
    /**
     * ERROR HANDLING TEST: Verifies that database errors are handled gracefully
     * and users are redirected to a safe location
     */
    it('handles database errors gracefully', async () => {
      // Setup: Create a request to the dashboard
      const request = createMockRequest({
        path: PROTECTED_URLS.DASHBOARD,
      })

      // Setup: Mock a database error
      vi.mocked(supabaseAdmin.from).mockImplementation(
        () =>
          ({
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: { message: 'Database error' },
                })
              ),
            })),
          }) as unknown as ReturnType<typeof supabaseAdmin.from>
      )

      // Execute: Run the middleware with the request
      await middleware(request)

      // Verify: User is redirected to home on error
      const redirectCalls = vi.mocked(NextResponse.redirect).mock.calls
      expect(redirectCalls.length).toBeGreaterThan(0)
      if (redirectCalls.length > 0) {
        expect(redirectCalls[0]?.[0]?.toString()).toContain('/')
      }
    })
  })
})
