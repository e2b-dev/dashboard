import { type NextFetchEvent, NextRequest } from 'next/server'
import type { Session } from 'next-auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authSession = vi.hoisted(() => ({
  current: null as Session | null,
}))
const authMiddlewareMock = vi.hoisted(() => vi.fn())
const signInMock = vi.hoisted(() => vi.fn())
const readSignupMetadataMock = vi.hoisted(() => vi.fn())
const setSignupMetadataCookieMock = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({
  auth: authMiddlewareMock.mockImplementation(
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
    authSession.current = null
    authMiddlewareMock.mockClear()
    signInMock.mockReset().mockResolvedValue(undefined)
    readSignupMetadataMock.mockReset().mockReturnValue({
      signup_ip: '203.0.113.10',
      signup_user_agent: 'Mozilla/5.0',
    })
    setSignupMetadataCookieMock.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    authSession.current = null
  })

  it('routes auth pages to Ory', async () => {
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

  it('does not run proxy Auth.js for API routes', async () => {
    await proxy(request('/api/trpc/user.update'), {} as NextFetchEvent)
    await proxy(request('/api/health'), {} as NextFetchEvent)
    await proxy(request('/api/auth/oauth/session'), {} as NextFetchEvent)

    expect(authMiddlewareMock).not.toHaveBeenCalled()
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
})
