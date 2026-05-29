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
    loggerMocks.error.mockClear()
    loggerMocks.debug.mockClear()
  })

  it('returns the normalized profile from the live identity lookup', async () => {
    authjsMock.mockResolvedValue({ user: { id: 'identity-1' } })
    getIdentityMock.mockResolvedValue({
      id: 'identity-1',
      traits: { email: 'ada@example.test', name: 'Ada' },
      credentials: {
        password: {
          config: { hashed_password: 'hash' },
        },
      },
    })

    const profile = await oryAuthProvider.getUserProfile()

    expect(getIdentityMock).toHaveBeenCalledWith({
      id: 'identity-1',
      includeCredential: ['password', 'oidc'],
    })
    expect(profile).toEqual({
      id: 'identity-1',
      email: 'ada@example.test',
      name: 'Ada',
      avatarUrl: null,
      providers: ['email'],
      canChangeEmail: true,
      canChangePassword: true,
    })
  })

  it('uses the identity id cached on the session, skipping external_id', async () => {
    authjsMock.mockResolvedValue({
      user: { id: 'legacy-id' },
      identityId: 'kratos-uuid',
    })
    getIdentityMock.mockResolvedValue({
      id: 'kratos-uuid',
      traits: { email: 'ada@example.test' },
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
    expect(getIdentityByExternalIDMock).not.toHaveBeenCalled()
    expect(profile?.id).toBe('kratos-uuid')
  })

  it('returns null when there is no session', async () => {
    authjsMock.mockResolvedValue(null)

    const profile = await oryAuthProvider.getUserProfile()

    expect(profile).toBeNull()
    expect(getIdentityMock).not.toHaveBeenCalled()
  })

  it('falls back to external_id when the subject is not a Kratos id', async () => {
    authjsMock.mockResolvedValue({ user: { id: 'legacy-id' } })
    getIdentityMock.mockRejectedValue(
      new ResponseError(new Response(null, { status: 404 }), 'not found')
    )
    getIdentityByExternalIDMock.mockResolvedValue({
      id: 'kratos-uuid',
      traits: { email: 'ada@example.test', name: 'Ada' },
      credentials: {
        password: {
          config: { hashed_password: 'hash' },
        },
      },
    })

    const profile = await oryAuthProvider.getUserProfile()

    expect(getIdentityByExternalIDMock).toHaveBeenCalledWith({
      externalID: 'legacy-id',
      includeCredential: ['password', 'oidc'],
    })
    expect(profile?.id).toBe('kratos-uuid')
    expect(profile?.providers).toEqual(['email'])
  })

  it('does not allow account credential changes for oidc-linked identities', async () => {
    authjsMock.mockResolvedValue({ user: { id: 'identity-1' } })
    getIdentityMock.mockResolvedValue({
      id: 'identity-1',
      traits: { email: 'ada@example.test', name: 'Ada' },
      credentials: {
        password: {
          config: { hashed_password: 'hash' },
        },
        oidc: {
          identifiers: ['github:123'],
        },
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

  it('returns null when neither id nor external_id matches', async () => {
    authjsMock.mockResolvedValue({ user: { id: 'missing' } })
    getIdentityMock.mockRejectedValue(
      new ResponseError(new Response(null, { status: 404 }), 'not found')
    )
    getIdentityByExternalIDMock.mockRejectedValue(
      new ResponseError(new Response(null, { status: 404 }), 'not found')
    )

    const profile = await oryAuthProvider.getUserProfile()

    expect(profile).toBeNull()
  })
})
