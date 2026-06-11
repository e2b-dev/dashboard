import type { Identity } from '@ory/client-fetch'
import type { Session } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authjsMock = vi.hoisted(() => vi.fn())
const authjsSignOutMock = vi.hoisted(() => vi.fn())
const getIdentityMock = vi.hoisted(() => vi.fn())
const updateIdentityMock = vi.hoisted(() => vi.fn())
const patchIdentityMock = vi.hoisted(() => vi.fn())
const revokeOAuthSessionsMock = vi.hoisted(() => vi.fn())
const revokeKratosSessionsMock = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({
  auth: authjsMock,
  signOut: authjsSignOutMock,
}))

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryIdentityApi: () => ({
    getIdentity: getIdentityMock,
    updateIdentity: updateIdentityMock,
    patchIdentity: patchIdentityMock,
  }),
}))

vi.mock('@/core/server/auth/ory/oauth-session', () => ({
  revokeOryOAuthSessionsForSubject: revokeOAuthSessionsMock,
}))

vi.mock('@/core/server/auth/ory/kratos-session', () => ({
  revokeKratosSessionsForIdentity: revokeKratosSessionsMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { oryAuthProvider } = await import('@/core/server/auth/ory/provider')

const nowSeconds = Math.floor(Date.now() / 1000)

function makeIdToken(authTime: number): string {
  return [
    Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url'),
    Buffer.from(JSON.stringify({ auth_time: authTime })).toString('base64url'),
    'sig',
  ].join('.')
}

function makeSession({
  idToken = makeIdToken(nowSeconds),
  identityId = 'kratos-uuid',
}: {
  idToken?: string
  identityId?: string
} = {}): Session {
  return {
    user: { id: 'e2b-user-id' },
    accessToken: 'access-token',
    idToken,
    identityId,
  } as Session
}

const currentIdentity = {
  id: 'kratos-uuid',
  schema_id: 'default',
  state: 'active',
  traits: { email: 'ada@example.test', name: 'Ada' },
  external_id: 'e2b-user-id',
  metadata_public: { public: true },
  metadata_admin: { admin: true },
} satisfies Partial<Identity>

describe('Ory account security', () => {
  beforeEach(() => {
    authjsMock.mockReset()
    authjsSignOutMock.mockReset().mockResolvedValue(undefined)
    getIdentityMock.mockReset().mockResolvedValue(currentIdentity)
    updateIdentityMock.mockReset().mockResolvedValue(undefined)
    patchIdentityMock.mockReset().mockResolvedValue(undefined)
    revokeOAuthSessionsMock.mockReset().mockResolvedValue(undefined)
    revokeKratosSessionsMock.mockReset().mockResolvedValue(undefined)
  })

  it('requires fresh authentication before credential changes', async () => {
    authjsMock.mockResolvedValue(
      makeSession({ idToken: makeIdToken(nowSeconds - 10_000) })
    )

    const result = await oryAuthProvider.updateUser({ password: 'new-secret' })

    expect(result).toEqual({ ok: false, code: 'reauthentication_needed' })
    expect(updateIdentityMock).not.toHaveBeenCalled()
  })

  it('uses Ory updateIdentity for fresh password changes', async () => {
    authjsMock.mockResolvedValue(makeSession())
    getIdentityMock
      .mockResolvedValueOnce(currentIdentity)
      .mockResolvedValueOnce({
        ...currentIdentity,
        credentials: { password: { config: { hashed_password: 'hash' } } },
      })

    const result = await oryAuthProvider.updateUser({ password: 'new-secret' })

    expect(updateIdentityMock).toHaveBeenCalledWith({
      id: 'kratos-uuid',
      updateIdentityBody: expect.objectContaining({
        schema_id: 'default',
        state: 'active',
        external_id: 'e2b-user-id',
        metadata_public: { public: true },
        metadata_admin: { admin: true },
        credentials: { password: { config: { password: 'new-secret' } } },
      }),
    })
    expect(result).toMatchObject({ ok: true, user: { id: 'e2b-user-id' } })
  })

  it('revokes Ory/Kratos sessions and clears Auth.js after credential changes', async () => {
    authjsMock.mockResolvedValue(makeSession())

    await oryAuthProvider.handleCredentialChangeSuccess()

    expect(revokeOAuthSessionsMock).toHaveBeenCalledWith('e2b-user-id')
    expect(revokeKratosSessionsMock).toHaveBeenCalledWith('kratos-uuid')
    expect(authjsSignOutMock).toHaveBeenCalledWith({ redirect: false })
  })
})
