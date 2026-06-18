import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type OrySessionTokens,
  openOrySession,
  orySessionCookieOptions,
  sealOrySession,
} from '@/core/server/auth/ory/session-cookie'

const tokens: OrySessionTokens = {
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
    const sealed = await sealOrySession(tokens)

    expect(sealed).not.toContain('access-token')
    expect(await openOrySession(sealed)).toEqual(tokens)
  })

  it('preserves a session without optional tokens', async () => {
    const minimal: OrySessionTokens = {
      accessToken: 'only-access',
      expiresAt: 123,
    }

    expect(await openOrySession(await sealOrySession(minimal))).toEqual(minimal)
  })

  it('returns null for missing or empty values', async () => {
    expect(await openOrySession(undefined)).toBeNull()
    expect(await openOrySession(null)).toBeNull()
    expect(await openOrySession('')).toBeNull()
  })

  it('returns null for a tampered token', async () => {
    const sealed = await sealOrySession(tokens)

    expect(await openOrySession(`${sealed}tamper`)).toBeNull()
  })

  it('returns null when sealed under a different secret', async () => {
    const sealed = await sealOrySession(tokens)

    vi.stubEnv('E2B_SESSION_SECRET', 'a-different-secret')

    expect(await openOrySession(sealed)).toBeNull()
  })

  it('rejects sealing without a configured secret', async () => {
    vi.stubEnv('E2B_SESSION_SECRET', '')

    await expect(sealOrySession(tokens)).rejects.toThrow(
      'E2B_SESSION_SECRET is not configured'
    )
  })

  it('marks the cookie httpOnly + lax and toggles secure on NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(orySessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
    })

    vi.stubEnv('NODE_ENV', 'development')
    expect(orySessionCookieOptions().secure).toBe(false)
  })
})
