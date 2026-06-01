import { ResponseError } from '@ory/client-fetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const patchIdentityMock = vi.hoisted(() => vi.fn())
const getIdentityMock = vi.hoisted(() => vi.fn())
const updateIdentityMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryIdentityApi: () => ({
    patchIdentity: patchIdentityMock,
    getIdentity: getIdentityMock,
    updateIdentity: updateIdentityMock,
  }),
}))

const { oryAuthFlows } = await import('@/core/server/auth/ory/flows')

function oryError(
  status: number,
  body: Record<string, unknown>
): ResponseError {
  return new ResponseError(
    new Response(JSON.stringify(body), { status }),
    'Response returned an error code'
  )
}

describe('oryAuthFlows.updateUser', () => {
  beforeEach(() => {
    patchIdentityMock.mockReset()
    getIdentityMock.mockReset()
    updateIdentityMock.mockReset()
    loggerMocks.error.mockClear()
  })

  it('patches only the provided traits and returns the mapped user', async () => {
    patchIdentityMock.mockResolvedValue({})
    getIdentityMock.mockResolvedValue({
      id: 'identity-1',
      traits: { email: 'new@example.test', name: 'Ada' },
      credentials: { password: { config: { hashed_password: 'hash' } } },
    })

    const result = await oryAuthFlows.updateUser({
      identityId: 'identity-1',
      name: 'Ada',
      email: 'new@example.test',
    })

    expect(patchIdentityMock).toHaveBeenCalledWith({
      id: 'identity-1',
      jsonPatch: [
        { op: 'replace', path: '/traits/name', value: 'Ada' },
        { op: 'replace', path: '/traits/email', value: 'new@example.test' },
      ],
    })
    expect(getIdentityMock).toHaveBeenCalledWith({
      id: 'identity-1',
      includeCredential: ['password', 'oidc'],
    })
    expect(result).toEqual({
      ok: true,
      user: expect.objectContaining({
        id: 'identity-1',
        email: 'new@example.test',
        name: 'Ada',
        // `password` credential is normalized to the `email` provider vocabulary
        providers: ['email'],
      }),
    })
  })

  it('sets the password via updateIdentity (import path) so Kratos hashes it', async () => {
    getIdentityMock
      .mockResolvedValueOnce({
        id: 'identity-1',
        schema_id: 'default',
        state: 'active',
        traits: { email: 'a@b.test', name: 'Ada' },
        external_id: 'legacy-id',
      })
      .mockResolvedValueOnce({
        id: 'identity-1',
        traits: { email: 'a@b.test' },
        credentials: { password: { config: { hashed_password: 'hash' } } },
      })
    updateIdentityMock.mockResolvedValue({})

    await oryAuthFlows.updateUser({
      identityId: 'identity-1',
      password: 'super-secret',
    })

    // not the raw patch — that writes cleartext without hashing
    expect(patchIdentityMock).not.toHaveBeenCalled()
    expect(updateIdentityMock).toHaveBeenCalledWith({
      id: 'identity-1',
      updateIdentityBody: expect.objectContaining({
        schema_id: 'default',
        state: 'active',
        external_id: 'legacy-id',
        traits: { email: 'a@b.test', name: 'Ada' },
        credentials: { password: { config: { password: 'super-secret' } } },
      }),
    })
    expect(getIdentityMock).toHaveBeenLastCalledWith({
      id: 'identity-1',
      includeCredential: ['password', 'oidc'],
    })
  })

  it('maps a 409 conflict to email_exists', async () => {
    patchIdentityMock.mockRejectedValue(
      oryError(409, {
        error: { code: 409, reason: 'identity address already exists' },
      })
    )

    const result = await oryAuthFlows.updateUser({
      identityId: 'identity-1',
      email: 'taken@example.test',
    })

    expect(result).toEqual({
      ok: false,
      code: 'email_exists',
      message: undefined,
    })
  })

  it('maps a 400 password policy violation to weak_password', async () => {
    getIdentityMock.mockResolvedValue({
      id: 'identity-1',
      schema_id: 'default',
      state: 'active',
      traits: { email: 'a@b.test' },
    })
    updateIdentityMock.mockRejectedValue(
      oryError(400, {
        error: {
          code: 400,
          reason: 'the password does not fulfill the password policy',
          message: 'password too short',
        },
      })
    )

    const result = await oryAuthFlows.updateUser({
      identityId: 'identity-1',
      password: 'short',
    })

    expect(result).toEqual({
      ok: false,
      code: 'weak_password',
      message: 'password too short',
    })
  })

  it('rethrows unclassified Ory errors as unexpected', async () => {
    patchIdentityMock.mockRejectedValue(
      oryError(500, { error: { code: 500, reason: 'internal error' } })
    )

    await expect(
      oryAuthFlows.updateUser({ identityId: 'identity-1', name: 'X' })
    ).rejects.toBeInstanceOf(ResponseError)
    expect(loggerMocks.error).toHaveBeenCalled()
  })

  it('rethrows non-Ory errors', async () => {
    patchIdentityMock.mockRejectedValue(new Error('network down'))

    await expect(
      oryAuthFlows.updateUser({ identityId: 'identity-1', name: 'X' })
    ).rejects.toThrow('network down')
  })
})
