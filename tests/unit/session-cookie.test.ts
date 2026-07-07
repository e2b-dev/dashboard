import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  joinSessionCookie,
  openSessionCookie,
  reconcileSessionCookies,
  resolveSessionCookieDomain,
  type SessionTokens,
  sealSessionCookie,
  sessionCookieDeleteOptions,
  sessionCookieNames,
  sessionCookieOptions,
  splitSessionCookie,
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

    expect(await openSessionCookie(await sealSessionCookie(minimal))).toEqual(
      minimal
    )
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
    expect(
      sessionCookieDeleteOptions('app.e2b-staging.dev', 'e2b_session.1')
    ).toEqual({
      name: 'e2b_session.1',
      path: '/',
      domain: '.e2b-staging.dev',
    })
  })
})

describe('e2b_session cookie chunking', () => {
  it('keeps a small value on the bare cookie name', () => {
    expect(splitSessionCookie('short')).toEqual([
      { name: 'e2b_session', value: 'short' },
    ])
  })

  it('splits a large value into sequential, capped chunks', () => {
    const value = 'x'.repeat(9000)
    const chunks = splitSessionCookie(value)

    expect(chunks.map((chunk) => chunk.name)).toEqual([
      'e2b_session.0',
      'e2b_session.1',
      'e2b_session.2',
    ])
    expect(chunks.every((chunk) => chunk.value.length <= 3800)).toBe(true)
    expect(chunks.map((chunk) => chunk.value).join('')).toBe(value)
  })

  it('round-trips a value through split then join', () => {
    const value = 'y'.repeat(9000)
    expect(joinSessionCookie(splitSessionCookie(value))).toBe(value)
  })

  it('reassembles chunks in numeric, not lexical, order', () => {
    const value = joinSessionCookie([
      { name: 'e2b_session.10', value: 'k' },
      { name: 'e2b_session.2', value: 'c' },
      { name: 'e2b_session.0', value: 'a' },
      { name: 'e2b_session.1', value: 'b' },
    ])
    // `.10` must sort after `.2`, so the value ends with 'k'.
    expect(value).toBe('abck')
  })

  it('reads a bare cookie when no chunks are present', () => {
    expect(joinSessionCookie([{ name: 'e2b_session', value: 'sealed' }])).toBe(
      'sealed'
    )
  })

  it('prefers chunks over a stale bare cookie', () => {
    expect(
      joinSessionCookie([
        { name: 'e2b_session', value: 'STALE' },
        { name: 'e2b_session.0', value: 'fresh-' },
        { name: 'e2b_session.1', value: 'value' },
      ])
    ).toBe('fresh-value')
  })

  it('returns undefined when no session cookie is present', () => {
    expect(joinSessionCookie([{ name: 'other', value: 'x' }])).toBeUndefined()
    expect(joinSessionCookie([])).toBeUndefined()
  })

  it('lists every session cookie name, ignoring unrelated cookies', () => {
    expect(
      sessionCookieNames([
        { name: 'e2b_session.0', value: 'a' },
        { name: 'e2b-selected-team-id', value: 't' },
        { name: 'e2b_session.1', value: 'b' },
        { name: 'e2b_session', value: 'c' },
      ])
    ).toEqual(['e2b_session.0', 'e2b_session.1', 'e2b_session'])
  })

  it('expires the bare cookie when a write grows into chunks', () => {
    const { write, expire } = reconcileSessionCookies('z'.repeat(9000), [
      { name: 'e2b_session', value: 'old' },
    ])

    expect(write.map((chunk) => chunk.name)).toEqual([
      'e2b_session.0',
      'e2b_session.1',
      'e2b_session.2',
    ])
    expect(expire).toEqual(['e2b_session'])
  })

  it('expires leftover chunks when a write shrinks to the bare cookie', () => {
    const { write, expire } = reconcileSessionCookies('small', [
      { name: 'e2b_session.0', value: 'a' },
      { name: 'e2b_session.1', value: 'b' },
      { name: 'e2b_session.2', value: 'c' },
    ])

    expect(write).toEqual([{ name: 'e2b_session', value: 'small' }])
    expect(expire).toEqual(['e2b_session.0', 'e2b_session.1', 'e2b_session.2'])
  })

  it('expires trailing chunks when a write shrinks to fewer chunks', () => {
    const { write, expire } = reconcileSessionCookies('q'.repeat(9000), [
      { name: 'e2b_session.0', value: 'a' },
      { name: 'e2b_session.1', value: 'b' },
      { name: 'e2b_session.2', value: 'c' },
      { name: 'e2b_session.3', value: 'd' },
      { name: 'e2b_session.4', value: 'e' },
    ])

    expect(write.map((chunk) => chunk.name)).toEqual([
      'e2b_session.0',
      'e2b_session.1',
      'e2b_session.2',
    ])
    expect(expire).toEqual(['e2b_session.3', 'e2b_session.4'])
  })

  it('seals, splits, and reopens an oversized session end-to-end', async () => {
    vi.stubEnv('E2B_SESSION_SECRET', 'unit-test-session-secret')

    const large: SessionTokens = {
      accessToken: 'a'.repeat(6000),
      refreshToken: 'r'.repeat(2000),
      idToken: 'i'.repeat(1000),
      expiresAt: 1_900_000_000,
    }

    const chunks = splitSessionCookie(await sealSessionCookie(large))
    expect(chunks.length).toBeGreaterThan(1)
    expect(await openSessionCookie(joinSessionCookie(chunks))).toEqual(large)

    vi.unstubAllEnvs()
  })
})
