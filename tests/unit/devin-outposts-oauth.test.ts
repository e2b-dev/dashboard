import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDevinOAuthAttempt,
  DevinOAuthError,
  exchangeDevinConnectionCode,
  getDevinOAuthCookieName,
  getDevinOAuthCookieOptions,
  isDevinOAuthConfigured,
  readDevinOAuthAttempt,
} from '@/core/modules/devin-outposts/oauth.server'

const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET
const ORIGINAL_CALLBACK_URL = process.env.DEVIN_OUTPOSTS_CALLBACK_URL
const ORIGINAL_CONNECT_URL = process.env.DEVIN_OUTPOSTS_CONNECT_URL

describe('Devin partner OAuth boundary', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-auth-secret-with-enough-entropy'
    process.env.DEVIN_OUTPOSTS_CALLBACK_URL = 'http://localhost:8765/callback'
    delete process.env.DEVIN_OUTPOSTS_CONNECT_URL
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    restoreEnv('AUTH_SECRET', ORIGINAL_AUTH_SECRET)
    restoreEnv('DEVIN_OUTPOSTS_CALLBACK_URL', ORIGINAL_CALLBACK_URL)
    restoreEnv('DEVIN_OUTPOSTS_CONNECT_URL', ORIGINAL_CONNECT_URL)
  })

  it('creates signed state and a matching S256 challenge', async () => {
    const { attemptCookie, connectUrl } = createDevinOAuthAttempt({
      operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
      returnOrigin: 'http://localhost:3000',
      teamId: 'team-1',
      teamSlug: 'test-team',
      userId: 'user-1',
    })
    const attempt = readDevinOAuthAttempt(attemptCookie)
    expect(attempt).toMatchObject({
      returnOrigin: 'http://localhost:3000',
      teamId: 'team-1',
      teamSlug: 'test-team',
      userId: 'user-1',
    })
    expect(connectUrl.origin).toBe('https://app.devin.ai')
    expect(connectUrl.pathname).toBe('/outposts/connect')
    expect(connectUrl.searchParams.get('callback_url')).toBe(
      'http://localhost:8765/callback'
    )
    expect(connectUrl.searchParams.get('platform')).toBe('linux')
    expect(connectUrl.searchParams.has('code_challenge_method')).toBe(false)

    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        access_token: 'scoped-token',
        api_base_url: 'https://api.devin.ai',
        outpost_pool_id: 'pool-1',
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    if (!attempt) throw new Error('expected signed OAuth attempt')
    await exchangeDevinConnectionCode('one-time-code', attempt)

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = request.body as URLSearchParams
    const verifier = body.get('code_verifier')
    if (!verifier) throw new Error('expected PKCE verifier')
    const challenge = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(verifier)
    )
    expect(Buffer.from(challenge).toString('base64url')).toBe(
      connectUrl.searchParams.get('code_challenge')
    )
    expect(attemptCookie).not.toContain(verifier)
  })

  it('rejects tampered and expired state', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T12:00:00Z'))
    const { attemptCookie } = createDevinOAuthAttempt({
      operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
      returnOrigin: 'http://localhost:3000',
      teamId: 'team-1',
      teamSlug: 'test-team',
      userId: 'user-1',
    })

    expect(readDevinOAuthAttempt(`${attemptCookie}x`)).toBeNull()
    vi.advanceTimersByTime(30 * 60 * 1000 + 1)
    expect(readDevinOAuthAttempt(attemptCookie)).toBeNull()
  })

  it('supports a Devin enterprise connect host without changing token exchange', async () => {
    process.env.DEVIN_OUTPOSTS_CONNECT_URL =
      'https://e2b.beta.devinenterprise.com/outposts/connect'
    const { attemptCookie, connectUrl } = createDevinOAuthAttempt({
      operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
      returnOrigin: 'http://localhost:3000',
      teamId: 'team-1',
      teamSlug: 'test-team',
      userId: 'user-1',
    })
    expect(connectUrl.origin).toBe('https://e2b.beta.devinenterprise.com')

    const attempt = readDevinOAuthAttempt(attemptCookie)
    if (!attempt) throw new Error('expected signed OAuth attempt')
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        access_token: 'scoped-token',
        api_base_url: 'https://e2b.beta.devinenterprise.com',
        outpost_pool_id: 'pool-1',
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    await exchangeDevinConnectionCode('one-time-code', attempt)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.devin.ai/outposts/connection-token',
      expect.anything()
    )
  })

  it('treats invalid_grant as terminal without exposing provider details', async () => {
    const { attemptCookie } = createDevinOAuthAttempt({
      operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
      returnOrigin: 'http://localhost:3000',
      teamId: 'team-1',
      teamSlug: 'test-team',
      userId: 'user-1',
    })
    const attempt = readDevinOAuthAttempt(attemptCookie)
    if (!attempt) throw new Error('expected signed OAuth attempt')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: 'invalid_grant',
            error_description: 'sensitive provider detail',
          },
          { status: 400 }
        )
      )
    )

    const error = await exchangeDevinConnectionCode(
      'expired-code',
      attempt
    ).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ kind: 'invalid_grant' })
    expect(error).not.toHaveProperty(
      'message',
      expect.stringContaining('sensitive provider detail')
    )
  })

  it('rejects malformed success responses', async () => {
    const { attemptCookie } = createDevinOAuthAttempt({
      operationId: '17d18dac-86d9-4a79-91e7-4477bd29327e',
      returnOrigin: 'http://localhost:3000',
      teamId: 'team-1',
      teamSlug: 'test-team',
      userId: 'user-1',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ access_token: 'token' }))
    )

    const attempt = readDevinOAuthAttempt(attemptCookie)
    if (!attempt) throw new Error('expected signed OAuth attempt')
    await expect(
      exchangeDevinConnectionCode('one-time-code', attempt)
    ).rejects.toMatchObject(new DevinOAuthError('response'))
  })

  it('fails closed for missing or unsafe callback configuration', () => {
    process.env.DEVIN_OUTPOSTS_CALLBACK_URL = 'https://attacker.example/cb'
    expect(isDevinOAuthConfigured('https://dashboard.example.com')).toBe(false)

    process.env.DEVIN_OUTPOSTS_CALLBACK_URL = 'http://localhost:8765/callback'
    delete process.env.AUTH_SECRET
    expect(isDevinOAuthConfigured('http://localhost:3000')).toBe(false)
  })

  it('fails closed for an unsafe connect-page override', () => {
    process.env.DEVIN_OUTPOSTS_CONNECT_URL =
      'https://attacker.example/outposts/connect'
    expect(isDevinOAuthConfigured('http://localhost:3000')).toBe(false)

    process.env.DEVIN_OUTPOSTS_CONNECT_URL =
      'https://e2b.beta.devinenterprise.com/chat'
    expect(isDevinOAuthConfigured('http://localhost:3000')).toBe(false)
  })

  it('requires the callback to use the dashboard hostname', () => {
    process.env.DEVIN_OUTPOSTS_CALLBACK_URL =
      'https://oauth.example.com/callback'
    expect(isDevinOAuthConfigured('https://dashboard.example.com')).toBe(false)
  })

  it('uses an isolated secure host cookie in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AUTH_COOKIE_PREFIX', 'dashboard-a')
    expect(getDevinOAuthCookieName()).toBe('__Host-dashboard-a.e2b-devin-oauth')
    expect(getDevinOAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    })
  })
})

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
