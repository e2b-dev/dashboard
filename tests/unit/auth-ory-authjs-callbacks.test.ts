import type { Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveIdentityMock = vi.hoisted(() => vi.fn())
const refreshOryTokenMock = vi.hoisted(() => vi.fn())
const ensureBootstrappedMock = vi.hoisted(() => vi.fn())
const persistSignupMetadataMock = vi.hoisted(() => vi.fn())
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

vi.mock('@/core/server/auth/ory/signup-metadata', () => ({
  persistOrySignupMetadataFromCookie: persistSignupMetadataMock,
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

describe('handleOryAuthJsSignIn', () => {
  beforeEach(() => {
    ensureBootstrappedMock.mockReset()
    cookieSetMock.mockReset()
    loggerMocks.error.mockClear()
  })

  it('allows sign-in only after dashboard bootstrap is confirmed', async () => {
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

  it('redirects to the bootstrap-failed logout flow on bootstrap failure', async () => {
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
  })
})

describe('persistOryTokensInAuthJsJwt', () => {
  beforeEach(() => {
    resolveIdentityMock.mockReset()
    refreshOryTokenMock.mockReset()
    persistSignupMetadataMock.mockReset()
  })

  it('uses the Hydra access-token subject as the app user id', async () => {
    resolveIdentityMock.mockResolvedValue({ id: 'kratos-uuid' })
    const accessToken = makeJwt({ sub: 'e2b-user-id' })

    const result = await persistOryTokensInAuthJsJwt({
      token: { sub: 'profile-sub-before-access-token' } as JWT,
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
    })
    expect(persistSignupMetadataMock).toHaveBeenCalledWith('kratos-uuid')
  })

  it('refreshes when the access token is near expiry', async () => {
    refreshOryTokenMock.mockResolvedValue({ accessToken: 'fresh' })

    const result = await persistOryTokensInAuthJsJwt({
      token: { expiresAt: Math.floor(Date.now() / 1000) + 30 } as JWT,
      account: null,
    })

    expect(refreshOryTokenMock).toHaveBeenCalled()
    expect(result).toEqual({ accessToken: 'fresh' })
  })

  it('refreshes when token expiry is missing but a refresh token is present', async () => {
    refreshOryTokenMock.mockResolvedValue({ accessToken: 'fresh' })

    const result = await persistOryTokensInAuthJsJwt({
      token: { refreshToken: 'rt', expiresAt: null } as JWT,
      account: null,
    })

    expect(refreshOryTokenMock).toHaveBeenCalled()
    expect(result).toEqual({ accessToken: 'fresh' })
  })
})

describe('projectOryJwtToAuthJsSession', () => {
  it('projects token fields onto the session', () => {
    const session = { user: { id: 'placeholder' } } as Session

    const result = projectOryJwtToAuthJsSession({
      session,
      token: {
        sub: 'e2b-user-id',
        accessToken: 'at',
        idToken: 'it',
        identityId: 'kratos-uuid',
      } as JWT,
    })

    expect(result.user.id).toBe('e2b-user-id')
    expect(result.accessToken).toBe('at')
    expect(result.idToken).toBe('it')
    expect(result.identityId).toBe('kratos-uuid')
  })
})
