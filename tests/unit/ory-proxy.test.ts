import { type NextFetchEvent, NextRequest } from 'next/server'
import type { Session } from 'next-auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authSession = vi.hoisted(() => ({
  current: null as Session | null,
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(
    (
      handler: (
        request: NextRequest & { auth: Session | null },
        event: NextFetchEvent
      ) => Response | Promise<Response>
    ) =>
      (request: NextRequest, event: NextFetchEvent) => {
        Object.defineProperty(request, 'auth', {
          configurable: true,
          value: authSession.current,
        })
        return handler(request as NextRequest & { auth: Session | null }, event)
      }
  ),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { proxy } = await import('@/proxy')

const originalAuthProvider = process.env.AUTH_PROVIDER

function request(path: string): NextRequest {
  return new NextRequest(`https://app.e2b.dev${path}`)
}

describe('Ory proxy auth routes', () => {
  beforeEach(() => {
    process.env.AUTH_PROVIDER = 'ory'
    authSession.current = null
  })

  afterEach(() => {
    process.env.AUTH_PROVIDER = originalAuthProvider
    authSession.current = null
  })

  it('redirects authenticated users from sign-in to the dashboard', async () => {
    authSession.current = {
      user: { id: 'user-id' },
      accessToken: 'access-token',
    } as Session

    const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

    expect(response.headers.get('location')).toBe(
      'https://app.e2b.dev/dashboard'
    )
  })

  it('redirects unauthenticated users from sign-up to Ory registration', async () => {
    const response = await proxy(
      request('/sign-up?returnTo=%2Fdashboard%2Fterminal'),
      {} as NextFetchEvent
    )

    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/api/auth/oauth-start?intent=signup')
    expect(location).toContain('returnTo=%2Fdashboard%2Fterminal')
  })

  it('treats sessions without an access token as unauthenticated on auth routes', async () => {
    authSession.current = {
      user: { id: 'user-id' },
    } as Session

    const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

    expect(response.headers.get('location')).toContain(
      '/api/auth/oauth-start?intent=signin'
    )
  })

  it('treats sessions without a user id as unauthenticated on auth routes', async () => {
    authSession.current = {
      accessToken: 'access-token',
    } as Session

    const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

    expect(response.headers.get('location')).toContain(
      '/api/auth/oauth-start?intent=signin'
    )
  })

  it('treats Auth.js error sessions as unauthenticated on auth routes', async () => {
    authSession.current = {
      user: { id: 'user-id' },
      accessToken: 'access-token',
      error: 'RefreshTokenError',
    } as Session

    const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

    expect(response.headers.get('location')).toContain(
      '/api/auth/oauth-start?intent=signin'
    )
  })
})
