import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const authjsMock = vi.hoisted(() => vi.fn())
const authjsSignOutMock = vi.hoisted(() => vi.fn())
const updateUserMock = vi.hoisted(() => vi.fn())
const revokeSessionsMock = vi.hoisted(() => vi.fn())
const resolveIdentityMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/auth', () => ({ auth: authjsMock, signOut: authjsSignOutMock }))

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
    authjsSignOutMock.mockReset().mockResolvedValue(undefined)
    updateUserMock.mockReset()
    revokeSessionsMock.mockReset()
    resolveIdentityMock.mockReset()
    resolveIdentityMock.mockResolvedValue({ id: 'kratos-uuid' })
    vi.stubEnv('ORY_SDK_URL', 'https://project.oryapis.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('starts account reauth through the Ory OAuth flow', async () => {
    const dispatch = await oryAuthProvider.startReauthForAccountSettings()

    expect(dispatch).toEqual({
      kind: 'redirect',
      to: '/api/auth/oauth-start?intent=reauth&returnTo=%2Fdashboard%2Faccount%3Freauth%3D1',
    })
  })

  it('patches the cached Kratos id but returns the app user id', async () => {
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

    expect(resolveIdentityMock).not.toHaveBeenCalled()
    expect(updateUserMock).toHaveBeenCalledWith({
      identityId: 'kratos-uuid',
      name: 'Ada',
      email: undefined,
      password: undefined,
    })
    expect(result).toEqual({
      ok: true,
      user: { id: 'e2b-user-id', email: 'ada@example.test' },
    })
  })

  it('resolves a Kratos id when the session only has the app user id', async () => {
    authjsMock.mockResolvedValue({
      user: { id: 'e2b-user-id' },
      accessToken: 'a',
      idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
    })
    updateUserMock.mockResolvedValue({ ok: true, user: { id: 'kratos-uuid' } })

    await oryAuthProvider.updateUser({ name: 'Ada' })

    expect(resolveIdentityMock).toHaveBeenCalledWith(
      expect.objectContaining({ subjects: ['e2b-user-id'] })
    )
    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ identityId: 'kratos-uuid' })
    )
  })

  it('requires fresh authentication before changing credentials', async () => {
    authjsMock.mockResolvedValue({
      user: { id: 'e2b-user-id' },
      accessToken: 'a',
      idToken: makeIdToken({ auth_time: nowSeconds - 10_000 }),
    })

    const result = await oryAuthProvider.updateUser({
      password: 'new-secret',
    })

    expect(result).toEqual({ ok: false, code: 'reauthentication_needed' })
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('forwards a credential change when auth_time is fresh', async () => {
    authjsMock.mockResolvedValue({
      user: { id: 'e2b-user-id' },
      identityId: 'kratos-uuid',
      accessToken: 'a',
      idToken: makeIdToken({ auth_time: nowSeconds - 30 }),
    })
    updateUserMock.mockResolvedValue({
      ok: true,
      user: { id: 'kratos-uuid' },
    })

    const result = await oryAuthProvider.updateUser({
      password: 'new-secret',
    })

    expect(updateUserMock).toHaveBeenCalledWith({
      identityId: 'kratos-uuid',
      name: undefined,
      email: undefined,
      password: 'new-secret',
    })
    expect(result).toEqual({ ok: true, user: { id: 'e2b-user-id' } })
  })

  it('revokes other sessions by Kratos identity id', async () => {
    authjsMock.mockResolvedValue({
      user: { id: 'e2b-user-id' },
      identityId: 'kratos-uuid',
      accessToken: 'a',
    })

    await oryAuthProvider.signOutOtherSessions()

    expect(revokeSessionsMock).toHaveBeenCalledWith('kratos-uuid')
  })

  it('signs out Auth.js, revokes Kratos sessions, and returns the Ory logout URL', async () => {
    authjsMock.mockResolvedValue({
      user: { id: 'e2b-user-id' },
      identityId: 'kratos-uuid',
      accessToken: 'a',
      idToken: 'id.token.sig',
    })

    const result = await oryAuthProvider.signOut({
      origin: 'https://app.e2b.dev',
    })

    expect(authjsSignOutMock).toHaveBeenCalledWith({ redirect: false })
    expect(revokeSessionsMock).toHaveBeenCalledWith('kratos-uuid')
    expect(result.redirectTo).toContain('/oauth2/sessions/logout')
    expect(result.redirectTo).toContain('id_token_hint=id.token.sig')
    expect(result.redirectTo).toContain(
      `post_logout_redirect_uri=${encodeURIComponent('https://app.e2b.dev/')}`
    )
  })
})
