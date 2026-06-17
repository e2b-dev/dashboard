import type { Identity, Session } from '@ory/client-fetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const getLogoutFlowMock = vi.hoisted(() => vi.fn())
const getIdentityMock = vi.hoisted(() => vi.fn())
const updateIdentityMock = vi.hoisted(() => vi.fn())
const patchIdentityMock = vi.hoisted(() => vi.fn())
const revokeKratosSessionsMock = vi.hoisted(() => vi.fn())

vi.mock('@ory/nextjs/app', () => ({
  getServerSession: getServerSessionMock,
  getLogoutFlow: getLogoutFlowMock,
}))

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryIdentityApi: () => ({
    getIdentity: getIdentityMock,
    updateIdentity: updateIdentityMock,
    patchIdentity: patchIdentityMock,
  }),
}))

vi.mock('@/core/server/auth/ory/kratos-session', () => ({
  revokeKratosSessionsForIdentity: revokeKratosSessionsMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { handleCredentialChangeSuccess, updateUser } = await import(
  '@/core/server/auth/ory/session'
)

// Kratos stamps `authenticated_at`; the session freshness check reads it.
function makeSession({
  authenticatedAt = new Date().toISOString(),
  identityId = 'kratos-uuid',
}: {
  authenticatedAt?: string
  identityId?: string
} = {}): Session {
  return {
    active: true,
    authenticated_at: authenticatedAt,
    identity: {
      id: identityId,
      traits: { email: 'ada@example.test', name: 'Ada' },
    },
  } as unknown as Session
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
    getServerSessionMock.mockReset()
    getLogoutFlowMock.mockReset()
    getIdentityMock.mockReset().mockResolvedValue(currentIdentity)
    updateIdentityMock.mockReset().mockResolvedValue(undefined)
    patchIdentityMock.mockReset().mockResolvedValue(undefined)
    revokeKratosSessionsMock.mockReset().mockResolvedValue(undefined)
  })

  it('requires fresh authentication before credential changes', async () => {
    getServerSessionMock.mockResolvedValue(
      makeSession({
        authenticatedAt: new Date(Date.now() - 10_000_000).toISOString(),
      })
    )

    const result = await updateUser({ password: 'new-secret' })

    expect(result).toEqual({ ok: false, code: 'reauthentication_needed' })
    expect(updateIdentityMock).not.toHaveBeenCalled()
  })

  it('uses Ory updateIdentity for fresh password changes', async () => {
    getServerSessionMock.mockResolvedValue(makeSession())
    getIdentityMock
      .mockResolvedValueOnce(currentIdentity)
      .mockResolvedValueOnce({
        ...currentIdentity,
        credentials: { password: { config: { hashed_password: 'hash' } } },
      })

    const result = await updateUser({ password: 'new-secret' })

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
    expect(result).toMatchObject({ ok: true, user: { id: 'kratos-uuid' } })
  })

  it('revokes Kratos sessions after credential changes', async () => {
    getServerSessionMock.mockResolvedValue(makeSession())

    await handleCredentialChangeSuccess()

    expect(revokeKratosSessionsMock).toHaveBeenCalledWith('kratos-uuid')
  })
})
