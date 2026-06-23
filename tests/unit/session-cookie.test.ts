import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  openSessionCookie,
  resolveSessionCookieDomain,
  sealSessionCookie,
  sessionCookieDeleteOptions,
  sessionCookieOptions,
  type SessionTokens,
} from '@/core/server/auth/ory/session-cookie'

const tokens: SessionTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  idToken: 'id-token',
  expiresAt: 1_900_000_000,
}

describe('e2b_session cookie', () => {
  beforeEach(() => {
    vi.stubEnv('E2B_SESSION_SECRET', 'unit-test-session-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips all token fields through seal/open', async () => {
    const sealed = await sealSessionCookie(tokens)

    expect(sealed).not.toContain('access-token')
    expect(await openSessionCookie(sealed)).toEqual(tokens)
  })

  it('preserves a session without optional tokens', async () => {
    const minimal: SessionTokens = {
      accessToken: 'only-access',
      expiresAt: 123,
    }

    expect(await openSessionCookie(await sealSessionCookie(minimal))).toEqual(minimal)
  })

  it('returns null for missing or empty values', async () => {
    expect(await openSessionCookie(undefined)).toBeNull()
    expect(await openSessionCookie(null)).toBeNull()
    expect(await openSessionCookie('')).toBeNull()
  })

  it('returns null for a tampered token', async () => {
    const sealed = await sealSessionCookie(tokens)

    expect(await openSessionCookie(`${sealed}tamper`)).toBeNull()
  })

  it('returns null when sealed under a different secret', async () => {
    const sealed = await sealSessionCookie(tokens)

    vi.stubEnv('E2B_SESSION_SECRET', 'a-different-secret')

    expect(await openSessionCookie(sealed)).toBeNull()
  })

  it('rejects sealing without a configured secret', async () => {
    vi.stubEnv('E2B_SESSION_SECRET', '')

    await expect(sealSessionCookie(tokens)).rejects.toThrow(
      'E2B_SESSION_SECRET is not configured'
    )
  })

  it('marks the cookie httpOnly + lax and toggles secure on NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
    })

    vi.stubEnv('NODE_ENV', 'development')
    expect(sessionCookieOptions().secure).toBe(false)
  })
})

describe('e2b_session cookie domain', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_E2B_DOMAIN', 'e2b-staging.dev')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('scopes a subdomain host to the parent domain', () => {
    expect(resolveSessionCookieDomain('dashboard.e2b-staging.dev')).toBe(
      '.e2b-staging.dev'
    )
  })

  it('scopes the apex host to the parent domain', () => {
    expect(resolveSessionCookieDomain('e2b-staging.dev')).toBe(
      '.e2b-staging.dev'
    )
  })

  it('ignores the port when matching', () => {
    expect(resolveSessionCookieDomain('e2b-staging.dev:3000')).toBe(
      '.e2b-staging.dev'
    )
  })

  it('returns no domain for unrelated hosts (localhost, previews)', () => {
    expect(resolveSessionCookieDomain('localhost')).toBeUndefined()
    expect(resolveSessionCookieDomain('preview.vercel.app')).toBeUndefined()
    // A suffix that is not a domain boundary must not match.
    expect(resolveSessionCookieDomain('evil-e2b-staging.dev')).toBeUndefined()
  })

  it('returns no domain when the env is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_E2B_DOMAIN', '')
    expect(
      resolveSessionCookieDomain('dashboard.e2b-staging.dev')
    ).toBeUndefined()
  })

  it('flows the resolved domain into set and delete options', () => {
    expect(sessionCookieOptions('app.e2b-staging.dev').domain).toBe(
      '.e2b-staging.dev'
    )
    expect(sessionCookieDeleteOptions('app.e2b-staging.dev')).toEqual({
      name: 'e2b_session',
      path: '/',
      domain: '.e2b-staging.dev',
    })
  })
})
