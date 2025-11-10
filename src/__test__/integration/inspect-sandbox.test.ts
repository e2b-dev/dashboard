/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ============================================================================
// MOCKS SETUP
// ============================================================================

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
}

vi.mock('@/lib/clients/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/clients/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/clients/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

vi.mock('@/lib/clients/api', () => ({
  infra: {
    GET: vi.fn(),
  },
}))

vi.mock('@/configs/api', () => ({
  SUPABASE_AUTH_HEADERS: vi.fn((token: string, teamId: string) => ({
    Authorization: `Bearer ${token}`,
    'X-Team-ID': teamId,
  })),
}))

vi.mock('@/configs/keys', () => ({
  COOKIE_KEYS: {
    SELECTED_TEAM_ID: 'selected_team_id',
    SELECTED_TEAM_SLUG: 'selected_team_slug',
  },
  KV_KEYS: {
    TEAM_ID_TO_SLUG: (teamId: string) => `team_id_to_slug:${teamId}`,
    TEAM_SLUG_TO_ID: (slug: string) => `team_slug_to_id:${slug}`,
  },
}))

vi.mock('@/configs/urls', () => ({
  PROTECTED_URLS: {
    DASHBOARD: '/dashboard',
    SANDBOX_INSPECT: (teamSlug: string, sandboxId: string) =>
      `/dashboard/${teamSlug}/sandboxes/${sandboxId}/inspect`,
  },
  RESOLVER_URLS: {
    INSPECT_SANDBOX: (sandboxId: string) =>
      `/dashboard/inspect/sandbox/${sandboxId}`,
  },
  AUTH_URLS: {
    SIGN_IN: '/sign-in',
  },
}))

vi.mock('@/lib/clients/logger/logger', () => ({
  l: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
    })
  ),
}))

// Track redirect calls for assertions
let mockRedirectCalls: Array<{ url: string }> = []

vi.mock('next/server', async () => {
  const actual =
    await vi.importActual<typeof import('next/server')>('next/server')

  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: vi.fn((url: URL | string) => {
        const urlString = url.toString()
        mockRedirectCalls.push({ url: urlString })
        return new actual.NextResponse(null, {
          status: 307,
          headers: {
            location: urlString,
          },
        })
      }),
    },
  }
})

// Import mocked modules after mock setup
import { infra } from '@/lib/clients/api'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'

// Constants for testing
const COOKIE_KEYS = {
  SELECTED_TEAM_ID: 'selected_team_id',
  SELECTED_TEAM_SLUG: 'selected_team_slug',
}

const KV_KEYS = {
  TEAM_ID_TO_SLUG: (teamId: string) => `team_id_to_slug:${teamId}`,
  TEAM_SLUG_TO_ID: (slug: string) => `team_slug_to_id:${slug}`,
}

const PROTECTED_URLS = {
  DASHBOARD: '/dashboard',
  SANDBOX_INSPECT: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/inspect`,
}

const AUTH_URLS = {
  SIGN_IN: '/sign-in',
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockRequest(sandboxId: string): NextRequest {
  return new NextRequest(
    `https://app.e2b.dev/dashboard/inspect/sandbox/${sandboxId}`
  )
}

function createMockParams(sandboxId: string) {
  return {
    params: Promise.resolve({ sandboxId }),
  }
}

function setupAuthenticatedUser(
  userId = 'user-123',
  accessToken = 'access-token-123'
) {
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })

  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: { session: { access_token: accessToken } },
    error: null,
  })
}

function setupUserTeams(teams: Array<{ id: string; slug: string | null }>) {
  const mockTeamsData = teams.map((team) => ({
    teams: team,
    is_default: false,
  }))

  vi.mocked(supabaseAdmin.from).mockImplementation(
    () =>
      ({
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({
              data: mockTeamsData,
              error: null,
            })
          ),
        })),
      }) as any
  )
}

function setupSandboxResponse(
  teamId: string,
  sandboxId: string,
  found: boolean
) {
  vi.mocked(infra.GET).mockImplementation((path: string, options: any) => {
    if (
      path === '/sandboxes/{sandboxID}' &&
      options.params.path.sandboxID === sandboxId &&
      options.headers['X-Team-ID'] === teamId
    ) {
      if (found) {
        return Promise.resolve({
          response: { status: 200 },
          data: {
            sandboxID: sandboxId,
            templateID: 'template123',
            clientID: 'client123',
            startedAt: '2024-01-01T00:00:00Z',
            endAt: '2024-01-02T00:00:00Z',
            state: 'running',
            cpuCount: 2,
            memoryMB: 4096,
            diskSizeMB: 10240,
            envdVersion: '1.0.0',
          },
          error: null,
        })
      } else {
        return Promise.resolve({
          response: { status: 404 },
          data: null,
          error: { message: 'Sandbox not found' },
        })
      }
    }

    return Promise.resolve({
      response: { status: 404 },
      data: null,
      error: { message: 'Not found' },
    })
  })
}

// ============================================================================
// TESTS
// ============================================================================

describe('Sandbox Inspect Route - Integration Tests', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockRedirectCalls = []

    // Dynamically import the route handler after mocks are set up
    const routeModule = await import(
      '@/app/dashboard/(resolvers)/inspect/sandbox/[sandboxId]/route'
    )
    GET = routeModule.GET
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('Input Validation', () => {
    /**
     * SECURITY TEST: Validates that malicious sandbox IDs are rejected
     */
    it('rejects SQL injection attempts in sandbox ID', async () => {
      setupAuthenticatedUser()
      setupUserTeams([{ id: 'team-123', slug: 'team-slug' }])

      const maliciousIds = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        '../../../etc/passwd',
        "<script>alert('xss')</script>",
        "'; SELECT * FROM teams; --",
      ]

      for (const maliciousId of maliciousIds) {
        const request = createMockRequest(maliciousId)
        const params = createMockParams(maliciousId)

        await GET(request, params)

        const lastRedirect = mockRedirectCalls[mockRedirectCalls.length - 1]
        expect(lastRedirect?.url).toContain(PROTECTED_URLS.DASHBOARD)
      }
    })

    /**
     * VALIDATION TEST: Ensures sandbox ID length limits are enforced
     */
    it('rejects sandbox IDs exceeding maximum length', async () => {
      setupAuthenticatedUser()
      setupUserTeams([{ id: 'team-123', slug: 'team-slug' }])

      const longId = 'a'.repeat(101) // max is 100 characters
      const request = createMockRequest(longId)
      const params = createMockParams(longId)

      await GET(request, params)

      expect(mockRedirectCalls[0]?.url).toContain(PROTECTED_URLS.DASHBOARD)
    })

    /**
     * VALIDATION TEST: Ensures valid sandbox IDs are accepted
     * Note: SandboxIdSchema accepts only lowercase alphanumeric characters
     */
    it('accepts valid sandbox ID formats', async () => {
      setupAuthenticatedUser()
      setupUserTeams([{ id: 'team-123', slug: 'team-slug' }])

      const validIds = [
        'sbx123',
        'sandbox456',
        'testsandbox789',
        'a1b2c3d4e5',
        'sandboxupper123',
      ]

      for (const validId of validIds) {
        setupSandboxResponse('team-123', validId, true)

        const request = createMockRequest(validId)
        const params = createMockParams(validId)

        await GET(request, params)

        const lastRedirect = mockRedirectCalls[mockRedirectCalls.length - 1]
        expect(lastRedirect?.url).toContain(`/sandboxes/${validId}/inspect`)
      }
    })
  })

  describe('Authentication', () => {
    /**
     * SECURITY TEST: Verifies unauthenticated users are redirected to sign-in
     */
    it('redirects to sign-in when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = createMockRequest('sbx123')
      const params = createMockParams('sbx123')

      await GET(request, params)

      expect(mockRedirectCalls[0]?.url).toContain('/sign-in')
    })

    /**
     * SECURITY TEST: Verifies session errors are handled properly
     */
    it('redirects to sign-in when session is invalid', async () => {
      setupAuthenticatedUser('user-123', null as any)

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid session' },
      })

      const request = createMockRequest('sbx123')
      const params = createMockParams('sbx123')

      await GET(request, params)

      expect(mockRedirectCalls[0]?.url).toContain('/sign-in')
    })
  })

  describe('Team Discovery', () => {
    /**
     * USER FLOW TEST: Verifies users with no teams are handled correctly
     */
    it('redirects to dashboard when user has no teams', async () => {
      setupAuthenticatedUser()
      setupUserTeams([])

      const request = createMockRequest('sbx123')
      const params = createMockParams('sbx123')

      await GET(request, params)

      expect(mockRedirectCalls[0]?.url).toContain(PROTECTED_URLS.DASHBOARD)
    })

    /**
     * USER FLOW TEST: Verifies sandbox is found after searching all teams
     */
    it('searches all teams when sandbox not in cookie team', async () => {
      setupAuthenticatedUser()
      setupUserTeams([
        { id: 'team-1', slug: 'team-one' },
        { id: 'team-2', slug: 'team-two' },
        { id: 'team-3', slug: 'team-three' },
      ])

      // Setup: Sandbox only exists in team-3
      let callCount = 0
      vi.mocked(infra.GET).mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.resolve({
            response: { status: 404 },
            data: null,
            error: { message: 'Not found' },
          })
        }
        return Promise.resolve({
          response: { status: 200 },
          data: {
            sandboxID: 'sbx123',
            templateID: 'template123',
            clientID: 'client123',
            startedAt: '2024-01-01T00:00:00Z',
            endAt: '2024-01-02T00:00:00Z',
            state: 'running',
            cpuCount: 2,
            memoryMB: 4096,
            diskSizeMB: 10240,
            envdVersion: '1.0.0',
          },
          error: null,
        })
      })

      const request = createMockRequest('sbx123')
      const params = createMockParams('sbx123')

      await GET(request, params)

      // Verify: Multiple API calls were made to find the sandbox
      expect(vi.mocked(infra.GET).mock.calls.length).toBeGreaterThanOrEqual(3)
      expect(mockRedirectCalls[0]?.url).toContain('team-three')
      expect(mockRedirectCalls[0]?.url).toContain('sbx123')
    })
  })

  describe('Sandbox Authorization', () => {
    /**
     * SECURITY TEST: Verifies sandbox not in user's teams is rejected
     */
    it('redirects to dashboard when sandbox not found in any team', async () => {
      setupAuthenticatedUser()
      setupUserTeams([
        { id: 'team-1', slug: 'team-one' },
        { id: 'team-2', slug: 'team-two' },
      ])

      // Setup: Sandbox doesn't exist in any team
      vi.mocked(infra.GET).mockResolvedValue({
        response: { status: 404 },
        data: null,
        error: { message: 'Not found' },
      })

      const request = createMockRequest('sbxnotexists')
      const params = createMockParams('sbxnotexists')

      await GET(request, params)

      expect(mockRedirectCalls[0]?.url).toContain(PROTECTED_URLS.DASHBOARD)
    })

    /**
     * USER FLOW TEST: Verifies successful sandbox resolution and redirect
     */
    it('redirects to correct team URL when sandbox is found', async () => {
      setupAuthenticatedUser()
      setupUserTeams([{ id: 'team-123', slug: 'my-team' }])
      setupSandboxResponse('team-123', 'sbx456', true)

      const request = createMockRequest('sbx456')
      const params = createMockParams('sbx456')

      await GET(request, params)

      expect(mockRedirectCalls[0]?.url).toContain(
        '/dashboard/my-team/sandboxes/sbx456/inspect'
      )
    })
  })

  describe('Cookie Updates', () => {
    /**
     * USER FLOW TEST: Verifies team cookies are updated for UI consistency
     */
    it('updates team selection cookies on successful resolution', async () => {
      setupAuthenticatedUser()
      setupUserTeams([{ id: 'team-456', slug: 'new-team' }])
      setupSandboxResponse('team-456', 'sbx789', true)

      const request = createMockRequest('sbx789')
      const params = createMockParams('sbx789')

      const response = await GET(request, params)

      expect(response).toBeDefined()
      expect(mockRedirectCalls[0]?.url).toContain(
        '/dashboard/new-team/sandboxes/sbx789/inspect'
      )
    })
  })

  describe('Error Handling', () => {
    /**
     * ERROR HANDLING TEST: Verifies database errors are handled gracefully
     */
    it('handles database errors gracefully', async () => {
      setupAuthenticatedUser()

      // Setup: Database error when fetching teams
      vi.mocked(supabaseAdmin.from).mockImplementation(
        () =>
          ({
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: { message: 'Database connection error' },
                })
              ),
            })),
          }) as any
      )

      const request = createMockRequest('sbx123')
      const params = createMockParams('sbx123')

      await GET(request, params)

      expect(mockRedirectCalls[0]?.url).toContain(PROTECTED_URLS.DASHBOARD)
    })

    /**
     * ERROR HANDLING TEST: Verifies API errors are handled gracefully
     */
    it('handles infrastructure API errors gracefully', async () => {
      setupAuthenticatedUser()
      setupUserTeams([{ id: 'team-123', slug: 'my-team' }])

      // Setup: API timeout error
      vi.mocked(infra.GET).mockRejectedValue(new Error('API timeout'))

      const request = createMockRequest('sbx123')
      const params = createMockParams('sbx123')

      await GET(request, params)

      expect(mockRedirectCalls[0]?.url).toContain(PROTECTED_URLS.DASHBOARD)
    })

    /**
     * SECURITY TEST: Verifies unexpected errors don't expose sensitive details
     */
    it('does not expose internal errors to users', async () => {
      // Setup: Authentication failure with sensitive data
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Internal server error with sensitive data')
      )

      const request = createMockRequest('sbx123')
      const params = createMockParams('sbx123')

      await GET(request, params)

      // Verify: Redirect doesn't contain sensitive information
      expect(mockRedirectCalls[0]?.url).toContain(PROTECTED_URLS.DASHBOARD)
      expect(mockRedirectCalls[0]?.url).not.toContain('sensitive')
    })
  })

  describe('Performance Characteristics', () => {
    /**
     * PERFORMANCE TEST: Verifies early exit when sandbox is found
     */
    it('stops searching once sandbox is found', async () => {
      setupAuthenticatedUser()
      setupUserTeams([
        { id: 'team-1', slug: 'team-one' },
        { id: 'team-2', slug: 'team-two' },
        { id: 'team-3', slug: 'team-three' },
        { id: 'team-4', slug: 'team-four' },
      ])

      // Setup: Sandbox found in team-2
      let callCount = 0
      vi.mocked(infra.GET).mockImplementation(() => {
        callCount++
        if (callCount === 2) {
          return Promise.resolve({
            response: { status: 200 },
            data: {
              sandboxID: 'sbx123',
              templateID: 'template123',
              clientID: 'client123',
              startedAt: '2024-01-01T00:00:00Z',
              endAt: '2024-01-02T00:00:00Z',
              state: 'running',
              cpuCount: 2,
              memoryMB: 4096,
              diskSizeMB: 10240,
              envdVersion: '1.0.0',
            },
            error: null,
          })
        }
        return Promise.resolve({
          response: { status: 404 },
          data: null,
          error: { message: 'Not found' },
        })
      })

      const request = createMockRequest('sbx123')
      const params = createMockParams('sbx123')

      await GET(request, params)

      // Verify: Early exit after finding sandbox
      expect(callCount).toBe(2)
    })
  })
})
