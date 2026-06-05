import { ResponseError } from '@ory/client-fetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const authjsMock = vi.hoisted(() => vi.fn())
const getIdentityMock = vi.hoisted(() => vi.fn())
const getIdentityByExternalIDMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/auth', () => ({
  auth: authjsMock,
}))

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryIdentityApi: () => ({
    getIdentity: getIdentityMock,
    getIdentityByExternalID: getIdentityByExternalIDMock,
  }),
}))

const { oryAuthProvider } = await import('@/core/server/auth/ory/provider')

describe('oryAuthProvider.getUserProfile', () => {
  beforeEach(() => {
    authjsMock.mockReset()
    getIdentityMock.mockReset()
    getIdentityByExternalIDMock.mockReset()
  })

  it('returns a live Kratos profile keyed by the app user id', async () => {
    authjsMock.mockResolvedValue({
      user: { id: 'e2b-user-id' },
      identityId: 'kratos-uuid',
    })
    getIdentityMock.mockResolvedValue({
      id: 'kratos-uuid',
      traits: { email: 'ada@example.test', name: 'Ada' },
      credentials: {
        password: {
          config: { hashed_password: 'hash' },
        },
      },
    })

    const profile = await oryAuthProvider.getUserProfile()

    expect(getIdentityMock).toHaveBeenCalledWith({
      id: 'kratos-uuid',
      includeCredential: ['password', 'oidc'],
    })
    expect(profile).toEqual({
      id: 'e2b-user-id',
      email: 'ada@example.test',
      name: 'Ada',
      avatarUrl: null,
      providers: ['email'],
      canChangeEmail: false,
      canChangePassword: true,
    })
  })

  it('falls back to external_id when the app user id is not a Kratos id', async () => {
    authjsMock.mockResolvedValue({ user: { id: 'e2b-user-id' } })
    getIdentityMock.mockRejectedValue(
      new ResponseError(new Response(null, { status: 404 }), 'not found')
    )
    getIdentityByExternalIDMock.mockResolvedValue({
      id: 'kratos-uuid',
      traits: { email: 'ada@example.test' },
      credentials: { password: { config: { hashed_password: 'hash' } } },
    })

    const profile = await oryAuthProvider.getUserProfile()

    expect(getIdentityByExternalIDMock).toHaveBeenCalledWith({
      externalID: 'e2b-user-id',
      includeCredential: ['password', 'oidc'],
    })
    expect(profile?.id).toBe('e2b-user-id')
    expect(profile?.providers).toEqual(['email'])
  })

  it('does not allow password changes for OIDC-linked identities', async () => {
    authjsMock.mockResolvedValue({ user: { id: 'identity-1' } })
    getIdentityMock.mockResolvedValue({
      id: 'identity-1',
      traits: { email: 'ada@example.test' },
      credentials: {
        password: { config: { hashed_password: 'hash' } },
        oidc: { identifiers: ['github:123'] },
      },
    })

    const profile = await oryAuthProvider.getUserProfile()

    expect(profile).toEqual(
      expect.objectContaining({
        canChangeEmail: false,
        canChangePassword: false,
      })
    )
  })
})
