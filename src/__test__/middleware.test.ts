import { vi, describe, test, expect } from 'vitest'

// Mock dependencies before imports
vi.mock('@/lib/clients/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: [
              {
                team_id: 'default-team-id',
                is_default: true,
                team: {
                  slug: 'default-team-slug',
                },
              },
            ],
            error: null,
          })
        ),
      })),
    })),
  },
}))

vi.mock('@/lib/clients/kv', () => ({
  kv: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve(true)),
  },
}))

vi.mock('@/lib/utils/server', () => ({
  checkUserTeamAuthorization: vi.fn(() => Promise.resolve(true)),
  resolveTeamId: vi.fn((id) => Promise.resolve(id)),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null,
        })
      ),
    },
  })),
}))

vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return {
    ...actual,
    NextResponse: {
      redirect: vi.fn((url) => ({
        url,
        cookies: {
          set: vi.fn(),
          delete: vi.fn(),
        },
      })),
      next: vi.fn(() => ({
        cookies: {
          set: vi.fn(),
          delete: vi.fn(),
        },
      })),
      rewrite: vi.fn((url) => ({
        url,
        cookies: {
          set: vi.fn(),
          delete: vi.fn(),
        },
      })),
    },
  }
})

import { middleware } from '../middleware'
import {
  resolveTeamForDashboard,
  isDashboardRoute,
  buildRedirectUrl,
  getAuthRedirect,
  setCookies,
  clearTeamCookies,
  handleTeamResolution,
} from '../server/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { COOKIE_KEYS } from '../configs/keys'
import { AUTH_URLS, PROTECTED_URLS } from '../configs/urls'

// Helper to create mock requests
function createMockRequest(
  path: string,
  options: {
    cookies?: Record<string, string>
    headers?: Record<string, string>
    method?: string
  } = {}
) {
  const url = new URL(`https://example.com${path}`)

  const request = new NextRequest(url, {
    method: options.method || 'GET',
    headers: new Headers(options.headers || {}),
  })

  // Add cookies
  if (options.cookies) {
    Object.entries(options.cookies).forEach(([name, value]) => {
      request.cookies.set(name, value)
    })
  }

  return request
}

// Unit tests for extracted functions
describe('URL Utilities', () => {
  /**
   * Tests the isDashboardRoute function to ensure it correctly identifies
   * dashboard routes vs non-dashboard routes.
   *
   * Justification: This is a critical function that determines routing behavior
   * throughout the application. If this fails, users could be incorrectly
   * redirected or blocked from accessing certain pages.
   */
  test('isDashboardRoute correctly identifies dashboard routes', () => {
    expect(isDashboardRoute('/dashboard')).toBe(true)
    expect(isDashboardRoute('/dashboard/teams')).toBe(true)
    expect(isDashboardRoute('/auth/signin')).toBe(false)
    expect(isDashboardRoute('/')).toBe(false)
  })

  /**
   * Tests the buildRedirectUrl function to ensure it constructs URLs correctly.
   *
   * Justification: Proper URL construction is essential for redirects to work.
   * This test verifies that the function maintains the correct origin while
   * changing the pathname, preventing cross-domain redirects or malformed URLs.
   */
  test('buildRedirectUrl constructs URLs correctly', () => {
    const request = createMockRequest('/current-path')
    const url = buildRedirectUrl('/new-path', request)
    expect(url.pathname).toBe('/new-path')
    expect(url.origin).toBe('https://example.com')
  })
})

describe('Authentication Utilities', () => {
  /**
   * Tests that unauthenticated users are redirected to sign-in when trying
   * to access protected routes.
   *
   * Justification: This is a core security feature - we must ensure that
   * protected routes remain inaccessible to unauthenticated users.
   */
  test('getAuthRedirect redirects unauthenticated users from protected routes', () => {
    const request = createMockRequest('/dashboard')
    const redirect = getAuthRedirect(request, false)
    expect(redirect).not.toBeNull()
    expect(redirect?.url.toString()).toContain(AUTH_URLS.SIGN_IN)
  })

  /**
   * Tests that authenticated users are redirected to the dashboard when
   * accessing the root path.
   *
   * Justification: This improves UX by automatically directing logged-in users
   * to their dashboard rather than showing them the public landing page.
   */
  test('getAuthRedirect redirects authenticated users from root path', () => {
    const request = createMockRequest('/')
    const redirect = getAuthRedirect(request, true)
    expect(redirect).not.toBeNull()
    expect(redirect?.url.toString()).toContain(PROTECTED_URLS.DASHBOARD)
  })

  /**
   * Tests that authenticated users can access protected routes without redirection.
   *
   * Justification: Ensures that authorized users have proper access to the
   * protected areas of the application they're entitled to use.
   */
  test('getAuthRedirect allows authenticated users on protected routes', () => {
    const request = createMockRequest('/dashboard')
    const redirect = getAuthRedirect(request, true)
    expect(redirect).toBeNull()
  })

  /**
   * Tests that unauthenticated users can access public routes.
   *
   * Justification: Confirms that public pages remain accessible to all users,
   * which is important for marketing, documentation, and other public-facing content.
   */
  test('getAuthRedirect allows unauthenticated users on public routes', () => {
    const request = createMockRequest('/about')
    const redirect = getAuthRedirect(request, false)
    expect(redirect).toBeNull()
  })
})

describe('Cookie Management', () => {
  /**
   * Tests that setCookies properly sets both team ID and slug cookies.
   *
   * Justification: Cookies are our primary mechanism for maintaining team context
   * across requests. This test ensures both required cookies are set with correct values.
   */
  test('setCookies sets team ID and slug cookies', () => {
    const response = { cookies: { set: vi.fn() } } as unknown as NextResponse
    const result = setCookies(response, 'team-123', 'team-slug')

    expect(response.cookies.set).toHaveBeenCalledTimes(2)
    expect(response.cookies.set).toHaveBeenCalledWith(
      COOKIE_KEYS.SELECTED_TEAM_ID,
      'team-123',
      expect.any(Object)
    )
    expect(response.cookies.set).toHaveBeenCalledWith(
      COOKIE_KEYS.SELECTED_TEAM_SLUG,
      'team-slug',
      expect.any(Object)
    )
    expect(result).toBe(response)
  })

  /**
   * Tests that setCookies works correctly when only team ID is provided.
   *
   * Justification: There are scenarios where we might only have the team ID
   * but not the slug. This test ensures the function handles this gracefully.
   */
  test('setCookies only sets team ID when slug is not provided', () => {
    const response = { cookies: { set: vi.fn() } } as unknown as NextResponse
    setCookies(response, 'team-123')

    expect(response.cookies.set).toHaveBeenCalledTimes(1)
    expect(response.cookies.set).toHaveBeenCalledWith(
      COOKIE_KEYS.SELECTED_TEAM_ID,
      'team-123',
      expect.any(Object)
    )
  })

  /**
   * Tests that clearTeamCookies properly removes all team-related cookies.
   *
   * Justification: When switching teams or logging out, we need to ensure
   * all team context is properly cleared to prevent data leakage between sessions.
   */
  test('clearTeamCookies deletes team cookies', () => {
    const response = { cookies: { delete: vi.fn() } } as unknown as NextResponse
    const result = clearTeamCookies(response)

    expect(response.cookies.delete).toHaveBeenCalledTimes(2)
    expect(response.cookies.delete).toHaveBeenCalledWith(
      COOKIE_KEYS.SELECTED_TEAM_ID
    )
    expect(response.cookies.delete).toHaveBeenCalledWith(
      COOKIE_KEYS.SELECTED_TEAM_SLUG
    )
    expect(result).toBe(response)
  })
})

describe('Team Resolution Handler', () => {
  /**
   * Tests that handleTeamResolution returns the response directly when access is allowed.
   *
   * Justification: For special routes like team creation, we need to bypass
   * normal team resolution. This test ensures those routes work correctly.
   */
  test('returns response directly when allowAccess is true', () => {
    const request = createMockRequest('/dashboard/new-team')
    const response = NextResponse.next()
    const teamResult = { allowAccess: true }

    const result = handleTeamResolution(request, response, teamResult)
    expect(result).toBe(response)
  })

  /**
   * Tests that handleTeamResolution redirects and clears cookies when no teamId is provided.
   *
   * Justification: When team resolution fails, we need to ensure users are redirected
   * appropriately and stale team data is cleared to prevent access issues.
   */
  test('redirects and clears cookies when no teamId is provided', () => {
    const request = createMockRequest('/dashboard')
    const response = NextResponse.next()
    const teamResult: Awaited<ReturnType<typeof resolveTeamForDashboard>> = {
      redirect: '/dashboard',
    }

    vi.mocked(NextResponse.redirect).mockReturnValueOnce({
      url: '/dashboard',
      cookies: {
        set: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as NextResponse)

    const result = handleTeamResolution(request, response, teamResult)

    expect(NextResponse.redirect).toHaveBeenCalled()
    expect(result.cookies.delete).toHaveBeenCalledTimes(2)
  })

  /**
   * Tests that handleTeamResolution redirects and sets cookies when a redirect is needed.
   *
   * Justification: When users need to be redirected to a specific team context,
   * we must ensure both the redirect happens and the appropriate cookies are set.
   */
  test('redirects and sets cookies when redirect is provided', () => {
    const request = createMockRequest('/dashboard')
    const response = NextResponse.next()
    const teamResult = {
      teamId: 'team-123',
      teamSlug: 'team-slug',
      redirect: '/dashboard/team-123',
    }

    vi.mocked(NextResponse.redirect).mockReturnValueOnce({
      url: '/dashboard/team-123',
      cookies: {
        set: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as NextResponse)

    const result = handleTeamResolution(request, response, teamResult)

    expect(NextResponse.redirect).toHaveBeenCalled()
    expect(result.cookies.set).toHaveBeenCalledTimes(2)
  })

  /**
   * Tests that handleTeamResolution sets cookies without redirecting when appropriate.
   *
   * Justification: For cases where the user is already on the correct page but
   * team context needs to be established, we should set cookies without redirecting.
   */
  test('sets cookies on response when no redirect is needed', () => {
    const request = createMockRequest('/dashboard/team-123')
    const response = { cookies: { set: vi.fn() } } as unknown as NextResponse
    const teamResult: Awaited<ReturnType<typeof resolveTeamForDashboard>> = {
      teamId: 'team-123',
      teamSlug: 'team-slug',
    }

    handleTeamResolution(request, response, teamResult)

    expect(response.cookies.set).toHaveBeenCalledTimes(2)
  })
})

// Integration tests for middleware
describe('Middleware Integration', () => {
  /**
   * Tests the complete authentication flow for unauthenticated users.
   *
   * Justification: This integration test verifies that the entire middleware
   * correctly handles unauthenticated users trying to access protected routes,
   * which is a critical security feature.
   */
  test('redirects to sign in when accessing protected route without auth', async () => {
    // Override the getUser mock for this test
    vi.mocked(createServerClient).mockImplementationOnce(() => ({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: null },
            error: { message: 'Not authenticated' },
          })
        ),
      },
    }))

    const request = createMockRequest(PROTECTED_URLS.DASHBOARD)
    const response = await middleware(request)

    expect(response.url.toString()).toContain(AUTH_URLS.SIGN_IN)
  })

  /**
   * Tests the root path redirection for authenticated users.
   *
   * Justification: This integration test ensures the complete middleware
   * correctly redirects authenticated users from the landing page to their dashboard,
   * improving user experience.
   */
  test('redirects to dashboard when authenticated user accesses root', async () => {
    const request = createMockRequest('/')
    const response = await middleware(request)

    expect(response.url.toString()).toContain(PROTECTED_URLS.DASHBOARD)
  })

  /**
   * Tests that team cookies are set when accessing a valid team dashboard.
   *
   * Justification: This integration test verifies that the complete middleware
   * correctly establishes team context when users access a specific team's dashboard.
   */
  test('sets team cookies when accessing dashboard with valid team', async () => {
    const request = createMockRequest(
      `${PROTECTED_URLS.DASHBOARD}/test-team-id`
    )
    const setCookieMock = vi.fn()

    vi.mocked(NextResponse.next).mockImplementationOnce(
      () =>
        ({
          cookies: {
            set: setCookieMock,
          },
        }) as unknown as NextResponse
    )

    await middleware(request)

    expect(setCookieMock).toHaveBeenCalled()
    expect(setCookieMock).toHaveBeenCalledWith(
      COOKIE_KEYS.SELECTED_TEAM_ID,
      expect.any(String),
      expect.any(Object)
    )
  })
})

// Tests for resolveTeamForDashboard
describe('resolveTeamForDashboard', () => {
  /**
   * Tests that the new team page is accessible without team context.
   *
   * Justification: The team creation page is a special case that should be
   * accessible even without an existing team context, as it's needed to create
   * the first team.
   */
  test('allows access to new team page', async () => {
    const request = createMockRequest(PROTECTED_URLS.NEW_TEAM)
    const result = await resolveTeamForDashboard(request, 'test-user-id')

    expect(result.allowAccess).toBe(true)
  })

  /**
   * Tests that team ID is correctly extracted from the URL path.
   *
   * Justification: When users access a specific team's dashboard directly via URL,
   * we need to correctly parse and validate the team ID from the URL.
   */
  test('resolves team ID from URL path', async () => {
    const request = createMockRequest(
      `${PROTECTED_URLS.DASHBOARD}/test-team-id`
    )
    const result = await resolveTeamForDashboard(request, 'test-user-id')

    expect(result.teamId).toBe('test-team-id')
  })

  /**
   * Tests the fallback to default team when no specific team is requested.
   *
   * Justification: Users should be directed to their default team when they
   * access the general dashboard without specifying a team, improving UX by
   * eliminating the need to always select a team.
   */
  test('falls back to default team when no team specified', async () => {
    const request = createMockRequest(PROTECTED_URLS.DASHBOARD)
    const result = await resolveTeamForDashboard(request, 'test-user-id')

    expect(result.teamId).toBe('default-team-id')
    expect(result.redirect).toContain(
      PROTECTED_URLS.SANDBOXES('default-team-slug')
    )
  })
})
