import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const authjsMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/auth', () => ({
  auth: authjsMock,
}))

const { oryAuthProvider } = await import('@/core/server/auth/ory/provider')

describe('OryAuthProvider.getAuthContext', () => {
  beforeEach(() => {
    authjsMock.mockReset()
    loggerMocks.warn.mockClear()
  })

  it('treats a session refresh error as unauthenticated', async () => {
    authjsMock.mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.dev' },
      accessToken: 'access-token',
      error: 'RefreshTokenError',
    })

    const result = await oryAuthProvider.getAuthContext()

    expect(result).toBeNull()
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'auth_provider:ory_session_error',
        user_id: 'user-1',
      }),
      expect.stringContaining("error 'RefreshTokenError'")
    )
  })

  it('returns AuthContext from a valid Auth.js session', async () => {
    authjsMock.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'a@b.dev',
        name: 'Alice',
        image: 'https://example.test/a.png',
      },
      accessToken: 'access-token',
    })

    const result = await oryAuthProvider.getAuthContext()

    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'a@b.dev',
        name: 'Alice',
        avatarUrl: 'https://example.test/a.png',
        providers: [],
        canChangeEmail: false,
        canChangePassword: false,
      },
      accessToken: 'access-token',
    })
  })
})
