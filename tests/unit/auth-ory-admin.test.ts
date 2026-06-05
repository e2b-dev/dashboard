import { ResponseError } from '@ory/client-fetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const identityApiMocks = vi.hoisted(() => ({
  getIdentity: vi.fn(),
  getIdentityByExternalID: vi.fn(),
  listIdentities: vi.fn(),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryIdentityApi: () => identityApiMocks,
}))

const { oryAuthAdmin } = await import('@/core/server/auth/ory/admin')

function notFound(): ResponseError {
  return new ResponseError(new Response(null, { status: 404 }), 'not found')
}

describe('oryAuthAdmin', () => {
  beforeEach(() => {
    identityApiMocks.getIdentity.mockReset()
    identityApiMocks.getIdentityByExternalID.mockReset()
    identityApiMocks.listIdentities.mockReset()
    loggerMocks.error.mockClear()
  })

  it('returns AuthUser keyed by the requested app user id', async () => {
    identityApiMocks.getIdentity.mockRejectedValue(notFound())
    identityApiMocks.getIdentityByExternalID.mockResolvedValue({
      id: 'kratos-uuid',
      traits: { email: 'ada@example.test', name: 'Ada' },
      credentials: { password: { config: { hashed_password: 'hash' } } },
    })

    const user = await oryAuthAdmin.getUserById('e2b-user-id')

    expect(identityApiMocks.getIdentity).toHaveBeenCalledWith({
      id: 'e2b-user-id',
      includeCredential: ['password', 'oidc'],
    })
    expect(identityApiMocks.getIdentityByExternalID).toHaveBeenCalledWith({
      externalID: 'e2b-user-id',
      includeCredential: ['password', 'oidc'],
    })
    expect(user).toEqual(
      expect.objectContaining({
        id: 'e2b-user-id',
        email: 'ada@example.test',
        providers: ['email'],
      })
    )
  })

  it('resolves emails by app user id when the Kratos id differs', async () => {
    identityApiMocks.listIdentities.mockResolvedValue([])
    identityApiMocks.getIdentity.mockRejectedValue(notFound())
    identityApiMocks.getIdentityByExternalID.mockResolvedValue({
      id: 'kratos-uuid',
      traits: { email: 'ada@example.test' },
    })

    const emails = await oryAuthAdmin.getEmailsByIds(['e2b-user-id'])

    expect(identityApiMocks.listIdentities).toHaveBeenCalledWith({
      ids: ['e2b-user-id'],
      pageSize: 1,
    })
    expect(emails.get('e2b-user-id')).toBe('ada@example.test')
  })
})
