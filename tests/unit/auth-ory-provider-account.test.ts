import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const authjsMock = vi.hoisted(() => vi.fn())
const updateUserMock = vi.hoisted(() => vi.fn())
const revokeSessionsMock = vi.hoisted(() => vi.fn())
const resolveIdentityMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/auth', () => ({ auth: authjsMock }))

vi.mock('@/core/server/auth/ory/flows', () => ({
  oryAuthFlows: { updateUser: updateUserMock },
}))

vi.mock('@/core/server/auth/ory/find-identity', () => ({
  resolveOryIdentity: resolveIdentityMock,
}))

vi.mock('@/core/server/auth/ory/kratos-session', () => ({
  revokeKratosSessionsForIdentity: revokeSessionsMock,
}))

const { oryAuthProvider } = await import('@/core/server/auth/ory/provider')

function makeIdToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
    'base64url'
  )
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${header}.${payload}.sig`
}

const nowSeconds = Math.floor(Date.now() / 1000)

describe('oryAuthProvider account operations', () => {
  beforeEach(() => {
    authjsMock.mockReset()
    updateUserMock.mockReset()
    revokeSessionsMock.mockReset()
    resolveIdentityMock.mockReset()
    // Vanilla case: the OIDC subject is the Kratos identity id.
    resolveIdentityMock.mockResolvedValue({ id: 'identity-1' })
    loggerMocks.error.mockClear()
  })

  describe('startReauthForAccountSettings', () => {
    it('redirects through oauth-start with the reauth intent', async () => {
      const dispatch = await oryAuthProvider.startReauthForAccountSettings()

      expect(dispatch).toEqual({
        kind: 'redirect',
        to: '/api/auth/oauth-start?intent=reauth&returnTo=%2Fdashboard%2Faccount%3Freauth%3D1',
      })
    })
  })

  describe('updateUser', () => {
    it('throws when there is no authenticated session', async () => {
      authjsMock.mockResolvedValue(null)

      await expect(oryAuthProvider.updateUser({ name: 'X' })).rejects.toThrow(
        'updateUser called without an authenticated Ory session'
      )
    })

    it('forwards a name-only change without a freshness gate', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'identity-1' },
        accessToken: 'a',
        idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
      })
      updateUserMock.mockResolvedValue({ ok: true, user: { id: 'identity-1' } })

      const result = await oryAuthProvider.updateUser({ name: 'Ada' })

      expect(updateUserMock).toHaveBeenCalledWith({
        identityId: 'identity-1',
        name: 'Ada',
        email: undefined,
        password: undefined,
      })
      expect(result).toEqual({ ok: true, user: { id: 'identity-1' } })
    })

    it('returns the app user id after patching a different Kratos identity id', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'e2b-user-id' },
        identityId: 'kratos-uuid',
        accessToken: 'a',
        idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
      })
      updateUserMock.mockResolvedValue({
        ok: true,
        user: { id: 'kratos-uuid', email: 'ada@example.test' },
      })

      const result = await oryAuthProvider.updateUser({ name: 'Ada' })

      expect(updateUserMock).toHaveBeenCalledWith(
        expect.objectContaining({ identityId: 'kratos-uuid' })
      )
      expect(result).toEqual({
        ok: true,
        user: { id: 'e2b-user-id', email: 'ada@example.test' },
      })
    })

    it('uses the identity id cached on the session without a lookup', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'legacy-id' },
        identityId: 'kratos-uuid',
        accessToken: 'a',
        idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
      })
      updateUserMock.mockResolvedValue({
        ok: true,
        user: { id: 'kratos-uuid' },
      })

      await oryAuthProvider.updateUser({ name: 'Ada' })

      expect(resolveIdentityMock).not.toHaveBeenCalled()
      expect(updateUserMock).toHaveBeenCalledWith(
        expect.objectContaining({ identityId: 'kratos-uuid' })
      )
    })

    it('patches the resolved Kratos id when the subject is an external_id', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'legacy-id' },
        accessToken: 'a',
        idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
      })
      resolveIdentityMock.mockResolvedValue({ id: 'kratos-uuid' })
      updateUserMock.mockResolvedValue({
        ok: true,
        user: { id: 'kratos-uuid' },
      })

      await oryAuthProvider.updateUser({ name: 'Ada' })

      expect(resolveIdentityMock).toHaveBeenCalledWith(
        expect.objectContaining({ subjects: ['legacy-id'] })
      )
      expect(updateUserMock).toHaveBeenCalledWith(
        expect.objectContaining({ identityId: 'kratos-uuid' })
      )
    })

    it('throws when the Ory identity cannot be resolved', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'ghost' },
        accessToken: 'a',
        idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
      })
      resolveIdentityMock.mockResolvedValue(null)

      await expect(oryAuthProvider.updateUser({ name: 'Ada' })).rejects.toThrow(
        'could not resolve an Ory identity'
      )
      expect(updateUserMock).not.toHaveBeenCalled()
    })

    it('requires reauth for an email change when auth_time is stale', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'identity-1' },
        accessToken: 'a',
        idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
      })

      const result = await oryAuthProvider.updateUser({
        email: 'new@example.test',
      })

      expect(result).toEqual({ ok: false, code: 'reauthentication_needed' })
      expect(updateUserMock).not.toHaveBeenCalled()
    })

    it('requires reauth for a password change when auth_time is stale', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'identity-1' },
        accessToken: 'a',
        idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
      })

      const result = await oryAuthProvider.updateUser({
        password: 'new-secret',
      })

      expect(result).toEqual({ ok: false, code: 'reauthentication_needed' })
      expect(updateUserMock).not.toHaveBeenCalled()
    })

    it('requires reauth for a password change when there is no id_token', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'identity-1' },
        accessToken: 'a',
      })

      const result = await oryAuthProvider.updateUser({
        password: 'new-secret',
      })

      expect(result).toEqual({ ok: false, code: 'reauthentication_needed' })
      expect(updateUserMock).not.toHaveBeenCalled()
    })

    it('forwards a password change when auth_time is fresh', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'identity-1' },
        accessToken: 'a',
        idToken: makeIdToken({ auth_time: nowSeconds - 30 }),
      })
      updateUserMock.mockResolvedValue({ ok: true, user: { id: 'identity-1' } })

      const result = await oryAuthProvider.updateUser({
        password: 'new-secret',
      })

      expect(updateUserMock).toHaveBeenCalledWith({
        identityId: 'identity-1',
        name: undefined,
        email: undefined,
        password: 'new-secret',
      })
      expect(result).toEqual({ ok: true, user: { id: 'identity-1' } })
    })
  })

  describe('signOutOtherSessions', () => {
    it('revokes all Kratos sessions for the current identity', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'identity-1' },
        accessToken: 'a',
      })
      revokeSessionsMock.mockResolvedValue(undefined)

      await oryAuthProvider.signOutOtherSessions()

      expect(revokeSessionsMock).toHaveBeenCalledWith('identity-1')
    })

    it('no-ops when there is no session', async () => {
      authjsMock.mockResolvedValue(null)

      await oryAuthProvider.signOutOtherSessions()

      expect(revokeSessionsMock).not.toHaveBeenCalled()
    })
  })
})
