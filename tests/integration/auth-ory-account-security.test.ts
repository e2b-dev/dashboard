import type { Identity } from '@ory/client-fetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const getIdentityMock = vi.hoisted(() => vi.fn())
const updateIdentityMock = vi.hoisted(() => vi.fn())
const patchIdentityMock = vi.hoisted(() => vi.fn())
const revokeOAuthSessionsMock = vi.hoisted(() => vi.fn())
const revokeKratosSessionsMock = vi.hoisted(() => vi.fn())
const revokeKratosSessionMock = vi.hoisted(() => vi.fn())
const disableOtherKratosSessionsMock = vi.hoisted(() => vi.fn())
const openSessionCookieMock = vi.hoisted(() => vi.fn())
const cookieDeleteMock = vi.hoisted(() => vi.fn())
const cookieGetAllMock = vi.hoisted(() => vi.fn())

vi.mock('@ory/nextjs/app', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: vi.fn(() => ({ value: 'sealed-cookie' })),
      getAll: cookieGetAllMock,
      delete: cookieDeleteMock,
    }),
  headers: () =>
    Promise.resolve({
      get: vi.fn(() => 'app.e2b.dev'),
    }),
}))

// Keep the real chunk helpers (join/names) and the app-owned cookie filter; only
// mock openSessionCookie (crypto) and pin the delete-options domain the tests
// assert on.
vi.mock('@/core/server/auth/ory/session-cookie', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/core/server/auth/ory/session-cookie')
  >()),
  openSessionCookie: openSessionCookieMock,
  sessionCookieDeleteOptions: (
    host: string | null | undefined,
    name = 'e2b_session'
  ) => ({
    name,
    path: '/',
    domain: host ? `.${host}` : undefined,
  }),
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
  revokeKratosSession: revokeKratosSessionMock,
  disableOtherKratosSessions: disableOtherKratosSessionsMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const {
  getAuthContext,
  handleCredentialChangeSuccess,
  handleInSessionPasswordChange,
  signOut,
  updateUser,
} = await import('@/core/server/auth/ory/session')

const currentIdentity = {
  id: 'kratos-uuid',
  schema_id: 'default',
  state: 'active',
  traits: { email: 'ada@example.test', name: 'Ada' },
  external_id: 'e2b-user-id',
  metadata_public: { public: true },
  metadata_admin: { admin: true },
} satisfies Partial<Identity>

function kratosSession({
  authenticatedAt = new Date(),
  identityId = 'kratos-uuid',
  sessionId = 'kratos-session-id',
}: {
  authenticatedAt?: Date
  identityId?: string
  sessionId?: string
} = {}) {
  return {
    id: sessionId,
    active: true,
    authenticated_at: authenticatedAt,
    identity: {
      id: identityId,
      external_id: 'e2b-user-id',
      traits: { email: 'ada@example.test', name: 'Ada' },
    },
  }
}

describe('Ory account security (Kratos session + e2b_session)', () => {
  beforeEach(() => {
    vi.stubEnv('ORY_HYDRA_PUBLIC_URL', 'https://ory.example.com')
    getServerSessionMock.mockReset()
    getIdentityMock.mockReset().mockResolvedValue(currentIdentity)
    updateIdentityMock.mockReset().mockResolvedValue(undefined)
    patchIdentityMock.mockReset().mockResolvedValue(undefined)
    revokeOAuthSessionsMock.mockReset().mockResolvedValue(undefined)
    revokeKratosSessionsMock.mockReset().mockResolvedValue(undefined)
    revokeKratosSessionMock.mockReset().mockResolvedValue(undefined)
    disableOtherKratosSessionsMock.mockReset().mockResolvedValue(undefined)
    openSessionCookieMock.mockReset().mockResolvedValue({
      accessToken: 'hydra-access-token',
      idToken: 'hydra-id-token',
      expiresAt: 1_900_000_000,
    })
    cookieDeleteMock.mockReset()
    cookieGetAllMock.mockReset().mockReturnValue([
      { name: 'ory_session_token', value: 'kratos-cookie' },
      { name: 'e2b_session', value: 'sealed-cookie' },
    ])
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds the auth context from the Kratos identity, token from e2b_session', async () => {
    getServerSessionMock.mockResolvedValue(kratosSession())

    expect(await getAuthContext()).toEqual({
      user: expect.objectContaining({
        id: 'e2b-user-id',
        identityId: 'kratos-uuid',
        email: 'ada@example.test',
        name: 'Ada',
      }),
      accessToken: 'hydra-access-token',
    })
  })

  it('returns null when the Kratos session is inactive despite a token', async () => {
    getServerSessionMock.mockResolvedValue({ active: false })

    expect(await getAuthContext()).toBeNull()
  })

  it('returns null when the Kratos identity has no external_id', async () => {
    getServerSessionMock.mockResolvedValue({
      id: 'kratos-session-id',
      active: true,
      authenticated_at: new Date(),
      identity: { id: 'kratos-uuid', traits: { email: 'ada@example.test' } },
    })

    expect(await getAuthContext()).toBeNull()
  })

  it('returns null when the Kratos session is active but no token is present', async () => {
    getServerSessionMock.mockResolvedValue(kratosSession())
    openSessionCookieMock.mockResolvedValue(null)

    expect(await getAuthContext()).toBeNull()
  })

  it('requires a fresh Kratos session before credential changes', async () => {
    getServerSessionMock.mockResolvedValue(
      kratosSession({ authenticatedAt: new Date(Date.now() - 20 * 60_000) })
    )

    const result = await updateUser({ password: 'new-secret' })

    expect(result).toEqual({ ok: false, code: 'reauthentication_needed' })
    expect(updateIdentityMock).not.toHaveBeenCalled()
  })

  it('uses Ory updateIdentity for fresh password changes', async () => {
    getServerSessionMock.mockResolvedValue(kratosSession())
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
        credentials: { password: { config: { password: 'new-secret' } } },
      }),
    })
    expect(result).toMatchObject({
      ok: true,
      user: { id: 'e2b-user-id', identityId: 'kratos-uuid' },
    })
  })

  it('revokes Ory + Kratos sessions and clears e2b_session after a credential change', async () => {
    getServerSessionMock.mockResolvedValue(kratosSession())

    await handleCredentialChangeSuccess()

    expect(revokeOAuthSessionsMock).toHaveBeenCalledWith('kratos-uuid')
    expect(revokeKratosSessionsMock).toHaveBeenCalledWith('kratos-uuid')
    expect(cookieDeleteMock).toHaveBeenCalledWith({
      name: 'e2b_session',
      path: '/',
      domain: '.app.e2b.dev',
    })
  })

  it('keeps the current device on an in-session password change: revokes only other sessions', async () => {
    getServerSessionMock.mockResolvedValue(kratosSession())

    await handleInSessionPasswordChange()

    // Other devices are signed out fully: their Kratos session via the forwarded
    // cookie (app-owned cookies stripped), and the subject's Hydra OAuth grants
    // so their cached refresh tokens die too.
    expect(disableOtherKratosSessionsMock).toHaveBeenCalledWith(
      'ory_session_token=kratos-cookie'
    )
    expect(revokeOAuthSessionsMock).toHaveBeenCalledWith('kratos-uuid')
    // The current device stays signed in: no all-sessions Kratos revoke and no
    // e2b_session cookie clear — it re-mints from its live Kratos session.
    expect(revokeKratosSessionsMock).not.toHaveBeenCalled()
    expect(cookieDeleteMock).not.toHaveBeenCalled()
  })

  it('signs out via Hydra RP-logout and revokes only the current Kratos session', async () => {
    getServerSessionMock.mockResolvedValue(kratosSession())

    const result = await signOut({ origin: 'https://app.e2b.dev' })

    expect(result.redirectTo).toContain(
      'https://ory.example.com/oauth2/sessions/logout'
    )
    expect(result.redirectTo).toContain('id_token_hint=hydra-id-token')
    expect(result.redirectTo).toContain('post_logout_redirect_uri=')
    // Revoke this session server-side so logout works even when Hydra skips the
    // /logout -> Kratos bridge (no active authentication session in production).
    expect(revokeKratosSessionMock).toHaveBeenCalledWith('kratos-session-id')
    // ...but single sign-out must not revoke every device's session.
    expect(revokeKratosSessionsMock).not.toHaveBeenCalled()
    expect(revokeOAuthSessionsMock).not.toHaveBeenCalled()
  })

  it('still signs out via Hydra RP-logout when no Kratos session is readable', async () => {
    getServerSessionMock.mockResolvedValue(undefined)

    const result = await signOut({ origin: 'https://app.e2b.dev' })

    expect(result.redirectTo).toContain(
      'https://ory.example.com/oauth2/sessions/logout'
    )
    expect(revokeKratosSessionMock).not.toHaveBeenCalled()
  })
})
