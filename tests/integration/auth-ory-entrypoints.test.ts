import { type NextFetchEvent, NextRequest } from 'next/server'
import type { Session } from 'next-auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authSession = vi.hoisted(() => ({
  current: null as Session | null,
}))
// Counts requests that actually pass through the Auth.js middleware wrapper,
// so tests can assert which routes are scoped into session resolution.
const authWrapperCalls = vi.hoisted(() => ({ count: 0 }))
const signInMock = vi.hoisted(() => vi.fn())
const readSignupMetadataMock = vi.hoisted(() => vi.fn())
const setSignupMetadataCookieMock = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({
  auth: vi.fn(
    (
      handler: (
        request: NextRequest & { auth: Session | null },
        event: NextFetchEvent
      ) => Response | Promise<Response>
    ) =>
      (request: NextRequest, event: NextFetchEvent) => {
        authWrapperCalls.count++
        Object.defineProperty(request, 'auth', {
          configurable: true,
          value: authSession.current,
        })
        return handler(request as NextRequest & { auth: Session | null }, event)
      }
  ),
  signIn: signInMock,
}))

vi.mock('@/core/server/auth/ory/signup-metadata', () => ({
  readOrySignupMetadataFromHeaders: readSignupMetadataMock,
  setOrySignupMetadataCookie: setSignupMetadataCookieMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { proxy } = await import('@/proxy')
const { GET: oauthStartGET } = await import('@/app/api/auth/oauth-start/route')

const originalAuthProvider = process.env.AUTH_PROVIDER

function request(path: string): NextRequest {
  return new NextRequest(`https://app.e2b.dev${path}`)
}

function orySession({
  accessToken,
  error,
  userId = 'user-id',
}: {
  accessToken?: string
  error?: string
  userId?: string
}): Session {
  return {
    user: userId ? { id: userId } : {},
    accessToken,
    error,
  } as Session
}

describe('Ory auth entrypoints', () => {
  beforeEach(() => {
    process.env.AUTH_PROVIDER = 'ory'
    authSession.current = null
    signInMock.mockReset().mockResolvedValue(undefined)
    readSignupMetadataMock.mockReset().mockReturnValue({
      signup_ip: '203.0.113.10',
      signup_user_agent: 'Mozilla/5.0',
    })
    setSignupMetadataCookieMock.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    process.env.AUTH_PROVIDER = originalAuthProvider
    authSession.current = null
  })

  it('routes legacy auth pages to Ory, including during auth migration', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MIGRATION_IN_PROGRESS', '1')

    const signIn = await proxy(request('/sign-in/'), {} as NextFetchEvent)
    const signUp = await proxy(
      request('/sign-up?returnTo=%2Fdashboard'),
      {} as NextFetchEvent
    )

    expect(signIn.headers.get('location')).toContain(
      '/api/auth/oauth-start?intent=signin'
    )
    expect(signUp.headers.get('location')).toContain(
      '/api/auth/oauth-start?intent=signup&returnTo=%2Fdashboard'
    )
  })

  it('does not treat incomplete Auth.js sessions as authenticated', async () => {
    for (const session of [
      orySession({}),
      orySession({ accessToken: 'access-token', userId: '' }),
      orySession({ accessToken: 'access-token', error: 'RefreshTokenError' }),
    ]) {
      authSession.current = session
      const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

      expect(response.headers.get('location')).toContain(
        '/api/auth/oauth-start?intent=signin'
      )
    }
  })

  it('redirects authenticated users away from auth pages', async () => {
    authSession.current = orySession({ accessToken: 'access-token' })

    const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

    expect(response.headers.get('location')).toBe(
      'https://app.e2b.dev/dashboard'
    )
  })

  it('starts Ory sign-in, registration, and re-auth with the right parameters', async () => {
    await oauthStartGET(
      new Request('https://app.e2b.dev/api/auth/oauth-start?intent=signin')
    )
    expect(signInMock).toHaveBeenLastCalledWith(
      'ory',
      { redirectTo: '/dashboard' },
      undefined
    )
    expect(readSignupMetadataMock).not.toHaveBeenCalled()

    await oauthStartGET(
      new Request(
        'https://app.e2b.dev/api/auth/oauth-start?intent=signup&returnTo=%2Fdashboard'
      )
    )
    expect(readSignupMetadataMock).toHaveBeenCalled()
    expect(setSignupMetadataCookieMock).toHaveBeenCalledWith({
      signup_ip: '203.0.113.10',
      signup_user_agent: 'Mozilla/5.0',
    })
    expect(signInMock).toHaveBeenLastCalledWith(
      'ory',
      { redirectTo: '/dashboard' },
      { prompt: 'registration' }
    )

    await oauthStartGET(
      new Request('https://app.e2b.dev/api/auth/oauth-start?intent=reauth')
    )
    expect(signInMock).toHaveBeenLastCalledWith(
      'ory',
      { redirectTo: '/dashboard' },
      { prompt: 'login' }
    )
  })

  it('rejects invalid Ory auth intents', async () => {
    const response = await oauthStartGET(
      new Request('https://app.e2b.dev/api/auth/oauth-start?intent=unknown')
    )

    expect(response?.status).toBe(400)
  })

  it('runs the Auth.js wrapper only for dashboard and auth routes', async () => {
    authSession.current = orySession({ accessToken: 'access-token' })

    for (const path of ['/dashboard/team/sandboxes', '/sign-in', '/sign-up']) {
      const before = authWrapperCalls.count
      await proxy(request(path), {} as NextFetchEvent)
      expect(authWrapperCalls.count, path).toBe(before + 1)
    }
  })

  it('keeps session-irrelevant routes out of the Auth.js wrapper', async () => {
    authSession.current = orySession({ accessToken: 'access-token' })

    for (const path of ['/', '/blog/post', '/_next/mintlify-assets/chunk.js']) {
      const before = authWrapperCalls.count
      const response = await proxy(request(path), {} as NextFetchEvent)

      expect(authWrapperCalls.count, path).toBe(before)
      // still served by the plain proxy, no auth redirect
      expect(response.headers.get('location'), path).toBeNull()
    }
  })
})
