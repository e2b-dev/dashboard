import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { proxy } from '@/proxy'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// mock supabase auth
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}))

// mock logger to avoid noise in tests
vi.mock('@/lib/clients/logger/logger', () => ({
  l: {
    error: vi.fn(),
  },
}))

// mock next/server to track redirects and responses
vi.mock('next/server', async () => {
  const actual =
    await vi.importActual<typeof import('next/server')>('next/server')

  const mockRedirect = vi.fn((url: URL | string, init?: ResponseInit) => {
    const response = new actual.NextResponse(null, {
      status: init?.status || 307,
      headers: {
        location: url.toString(),
        ...(init?.headers || {}),
      },
    })

    Object.defineProperty(response, 'cookies', {
      value: {
        set: vi.fn(),
        get: vi.fn(),
        getAll: vi.fn(() => []),
      },
      writable: true,
    })

    return response
  })

  const mockNext = vi.fn((init?: { request?: NextRequest }) => {
    const response = new actual.NextResponse()

    Object.defineProperty(response, 'cookies', {
      value: {
        set: vi.fn(),
        getAll: vi.fn(() => []),
      },
      writable: true,
    })

    return response
  })

  const mockRewrite = vi.fn(
    (url: URL | string, init?: { request?: { headers?: Headers } }) => {
      const response = new actual.NextResponse()

      Object.defineProperty(response, 'headers', {
        value: new Headers(),
        writable: true,
      })

      return response
    }
  )

  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: mockRedirect,
      next: mockNext,
      rewrite: mockRewrite,
    },
  }
})

function createMockRequest({
  url = 'https://app.e2b.dev',
  path = '/',
  headers = {},
}: {
  url?: string
  path?: string
  headers?: Record<string, string>
} = {}): NextRequest {
  const fullUrl = `${url}${path}`

  return new NextRequest(fullUrl, {
    headers: new Headers(headers),
  })
}

describe('Proxy Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // default: authenticated user
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
    it('redirects unauthenticated users accessing dashboard to sign in', async () => {
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

      const response = await proxy(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectUrl = vi
        .mocked(NextResponse.redirect)
        .mock.calls[0]?.[0]?.toString()
      expect(redirectUrl).toContain(AUTH_URLS.SIGN_IN)
    })

    it('redirects authenticated users accessing auth pages to dashboard', async () => {
      const request = createMockRequest({
        path: AUTH_URLS.SIGN_IN,
      })

      const response = await proxy(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectUrl = vi
        .mocked(NextResponse.redirect)
        .mock.calls[0]?.[0]?.toString()
      expect(redirectUrl).toContain(PROTECTED_URLS.DASHBOARD)
    })

    it('allows authenticated users to access dashboard', async () => {
      const request = createMockRequest({
        path: '/dashboard/team-123/sandboxes',
      })

      const response = await proxy(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('allows unauthenticated users to access public pages', async () => {
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
        path: '/',
      })

      const response = await proxy(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles auth errors gracefully and continues', async () => {
      vi.mocked(createServerClient).mockImplementation(
        () =>
          ({
            auth: {
              getUser: vi
                .fn()
                .mockRejectedValue(new Error('Auth service error')),
            },
          }) as unknown as ReturnType<typeof createServerClient>
      )

      const request = createMockRequest({
        path: '/',
      })

      const response = await proxy(request)

      // should not crash, should return next()
      expect(NextResponse.next).toHaveBeenCalled()
    })
  })
})
