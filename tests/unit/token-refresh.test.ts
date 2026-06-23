import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionTokens } from '@/core/server/auth/ory/session-cookie'
import {
  isAccessTokenExpiring,
  refreshSessionTokens,
} from '@/core/server/auth/ory/token-refresh'

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const current: SessionTokens = {
  accessToken: 'old-access',
  refreshToken: 'old-refresh',
  idToken: 'old-id',
  expiresAt: 1_000,
}

function stubTokenResponse(response: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response)
  )
}

describe('isAccessTokenExpiring', () => {
  it('is true within the 60s skew and false beyond it', () => {
    const now = 1_000
    expect(isAccessTokenExpiring(now + 30, now)).toBe(true)
    expect(isAccessTokenExpiring(now + 60, now)).toBe(true)
    expect(isAccessTokenExpiring(now + 120, now)).toBe(false)
  })
})

describe('refreshSessionTokens', () => {
  beforeEach(() => {
    vi.stubEnv('ORY_HYDRA_PUBLIC_URL', 'https://ory.example.com')
    vi.stubEnv('ORY_OAUTH2_CLIENT_ID', 'dashboard-client')
    vi.stubEnv('ORY_OAUTH2_CLIENT_SECRET', 'dashboard-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('is dead when there is no refresh token (no network call)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await refreshSessionTokens({ accessToken: 'a', expiresAt: 1 })
    ).toEqual({
      status: 'dead',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is dead on invalid_grant', async () => {
    stubTokenResponse(
      new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(await refreshSessionTokens(current)).toEqual({ status: 'dead' })
  })

  it('is unchanged on a transient server error', async () => {
    stubTokenResponse(new Response('upstream down', { status: 503 }))

    expect(await refreshSessionTokens(current)).toEqual({ status: 'unchanged' })
  })

  it('refreshes and returns rotated tokens', async () => {
    stubTokenResponse(
      Response.json({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        id_token: 'new-id',
        expires_in: 3600,
      })
    )

    const result = await refreshSessionTokens(current)

    expect(result.status).toBe('refreshed')
    if (result.status !== 'refreshed') throw new Error('unreachable')
    expect(result.tokens.accessToken).toBe('new-access')
    expect(result.tokens.refreshToken).toBe('new-refresh')
    expect(result.tokens.idToken).toBe('new-id')
    expect(result.tokens.expiresAt).toBeGreaterThan(
      Math.floor(Date.now() / 1000)
    )
  })

  it('keeps the current refresh + id token when Hydra omits them', async () => {
    stubTokenResponse(
      Response.json({ access_token: 'new-access', expires_in: 3600 })
    )

    const result = await refreshSessionTokens(current)

    if (result.status !== 'refreshed') throw new Error('expected refreshed')
    expect(result.tokens.refreshToken).toBe('old-refresh')
    expect(result.tokens.idToken).toBe('old-id')
  })
})
