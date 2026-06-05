import type { Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveIdentityMock = vi.hoisted(() => vi.fn())
const refreshOryTokenMock = vi.hoisted(() => vi.fn())
const ensureBootstrappedMock = vi.hoisted(() => vi.fn())
const cookieSetMock = vi.hoisted(() => vi.fn())
const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ set: cookieSetMock })),
}))

vi.mock('@/core/server/auth/ory/find-identity', () => ({
  resolveOryIdentity: resolveIdentityMock,
}))

vi.mock('@/core/server/auth/ory/dashboard-bootstrap', () => ({
  ensureOryUserBootstrapped: ensureBootstrappedMock,
}))

vi.mock('@/core/server/auth/ory/refresh-token', () => ({
  refreshOryToken: refreshOryTokenMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const {
  handleOryAuthJsSignIn,
  persistOryTokensInAuthJsJwt,
  projectOryJwtToAuthJsSession,
} = await import('@/core/server/auth/ory/authjs-callbacks')

function makeJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
    'base64url'
  )
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${header}.${payload}.sig`
}

const nowSeconds = Math.floor(Date.now() / 1000)

describe('handleOryAuthJsSignIn', () => {
  beforeEach(() => {
    ensureBootstrappedMock.mockReset()
    cookieSetMock.mockReset()
    loggerMocks.error.mockClear()
    loggerMocks.warn.mockClear()
  })

  it('allows sign-in when dashboard bootstrap is confirmed', async () => {
    ensureBootstrappedMock.mockResolvedValue(true)

    const result = await handleOryAuthJsSignIn({
      account: {
        provider: 'ory',
        type: 'oidc',
        providerAccountId: 'x',
        access_token: 'at',
        id_token: 'it',
      },
    })

    expect(result).toBe(true)
    expect(ensureBootstrappedMock).toHaveBeenCalledWith({
      accessToken: 'at',
      idToken: 'it',
      provider: 'ory',
    })
  })

  it('redirects to bootstrap-failed flow when bootstrap cannot be confirmed', async () => {
    ensureBootstrappedMock.mockResolvedValue(false)

    const result = await handleOryAuthJsSignIn({
      account: {
        provider: 'ory',
        type: 'oidc',
        providerAccountId: 'x',
        access_token: 'at',
        id_token: 'id-token',
      },
    })

    expect(result).toBe('/api/auth/oauth/bootstrap-failed')
    expect(cookieSetMock).toHaveBeenCalledWith(
      'e2b-ory-bootstrap-failed-id-token',
      'id-token',
      expect.objectContaining({ httpOnly: true, maxAge: 60 })
    )
    expect(loggerMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'auth_callbacks:sign_in:bootstrap_failed',
      }),
      expect.stringContaining('could not be confirmed')
    )
  })

  it('redirects to bootstrap-failed flow when Auth.js provides no access token', async () => {
    const result = await handleOryAuthJsSignIn({
      account: {
        provider: 'ory',
        type: 'oidc',
        providerAccountId: 'x',
      },
    })

    expect(result).toBe('/api/auth/oauth/bootstrap-failed')
    expect(ensureBootstrappedMock).not.toHaveBeenCalled()
    expect(cookieSetMock).not.toHaveBeenCalled()
  })
})

describe('persistOryTokensInAuthJsJwt', () => {
  beforeEach(() => {
    resolveIdentityMock.mockReset()
    refreshOryTokenMock.mockReset()
  })

  it('persists Ory tokens and the resolved Kratos id on fresh sign-in', async () => {
    resolveIdentityMock.mockResolvedValue({ id: 'kratos-uuid' })
    const accessToken = makeJwt({ sub: 'e2b-user-id' })

    const result = await persistOryTokensInAuthJsJwt({
      token: {
        sub: 'profile-sub-before-access-token',
        error: 'StalePoison',
      } as JWT,
      account: {
        provider: 'ory',
        type: 'oidc',
        providerAccountId: 'x',
        access_token: accessToken,
        refresh_token: 'rt',
        id_token: makeJwt({ email: 'ada@example.test' }),
        expires_at: 1234,
      },
      profile: { sub: 'profile-sub' },
    })

    expect(resolveIdentityMock).toHaveBeenCalledWith({
      subjects: ['profile-sub', 'e2b-user-id'],
      email: 'ada@example.test',
    })
    expect(result).toMatchObject({
      sub: 'e2b-user-id',
      accessToken,
      refreshToken: 'rt',
      expiresAt: 1234,
      identityId: 'kratos-uuid',
      error: undefined,
    })
  })

  it('leaves identityId undefined when resolution fails (sign-in not blocked)', async () => {
    resolveIdentityMock.mockResolvedValue(null)

    const result = await persistOryTokensInAuthJsJwt({
      token: {} as JWT,
      account: {
        provider: 'ory',
        type: 'oidc',
        providerAccountId: 'x',
        access_token: 'at',
      },
    })

    expect(result.identityId).toBeUndefined()
    expect(result.accessToken).toBe('at')
  })

  it('marks the token invalid when Auth.js does not provide an Ory token account', async () => {
    const result = await persistOryTokensInAuthJsJwt({
      token: { sub: 'e2b-user-id' } as JWT,
      account: {
        provider: 'ory',
        type: 'oidc',
        providerAccountId: 'x',
      },
    })

    expect(result).toMatchObject({
      sub: 'e2b-user-id',
      error: 'InvalidOryAccount',
    })
    expect(resolveIdentityMock).not.toHaveBeenCalled()
  })

  it('stops retrying once the token carries a refresh error', async () => {
    const token = { error: 'RefreshTokenError', sub: 'x' } as JWT

    const result = await persistOryTokensInAuthJsJwt({ token, account: null })

    expect(result).toBe(token)
    expect(refreshOryTokenMock).not.toHaveBeenCalled()
  })

  it('refreshes when the access token is near expiry', async () => {
    refreshOryTokenMock.mockResolvedValue({ accessToken: 'fresh' })

    const result = await persistOryTokensInAuthJsJwt({
      token: { expiresAt: nowSeconds + 30 } as JWT,
      account: null,
    })

    expect(refreshOryTokenMock).toHaveBeenCalled()
    expect(result).toEqual({ accessToken: 'fresh' })
  })

  it('leaves a still-valid token untouched', async () => {
    const token = { expiresAt: nowSeconds + 3600 } as JWT

    const result = await persistOryTokensInAuthJsJwt({ token, account: null })

    expect(result).toBe(token)
    expect(refreshOryTokenMock).not.toHaveBeenCalled()
  })
})

describe('projectOryJwtToAuthJsSession', () => {
  it('projects the token fields onto the session', () => {
    const session = { user: { id: 'placeholder' } } as Session

    const result = projectOryJwtToAuthJsSession({
      session,
      token: {
        sub: 'e2b-user-id',
        accessToken: 'at',
        idToken: 'it',
        identityId: 'kratos-uuid',
        error: undefined,
      } as JWT,
    })

    expect(result.user.id).toBe('e2b-user-id')
    expect(result.accessToken).toBe('at')
    expect(result.idToken).toBe('it')
    expect(result.identityId).toBe('kratos-uuid')
  })
})
