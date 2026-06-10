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

describe('OryAuthProvider', () => {
  beforeEach(() => {
    loggerMocks.error.mockClear()
    loggerMocks.warn.mockClear()
    authjsMock.mockReset()
  })

  describe('getAuthContext', () => {
    it('returns null when there is no session', async () => {
      authjsMock.mockResolvedValue(null)

      const result = await oryAuthProvider.getAuthContext()

      expect(result).toBeNull()
      expect(loggerMocks.error).not.toHaveBeenCalled()
    })

    it('returns null when accessToken is missing', async () => {
      authjsMock.mockResolvedValue({
        user: { id: 'user-1', email: 'a@b.dev' },
        accessToken: undefined,
      })

      const result = await oryAuthProvider.getAuthContext()

      expect(result).toBeNull()
    })

    it('returns null and warns when the session reports a refresh error', async () => {
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
          context: expect.objectContaining({ error: 'RefreshTokenError' }),
        }),
        expect.stringContaining("error 'RefreshTokenError'")
      )
    })

    it('returns null and logs when Auth.js auth() throws', async () => {
      const failure = new Error('boom')
      authjsMock.mockRejectedValue(failure)

      const result = await oryAuthProvider.getAuthContext()

      expect(result).toBeNull()
      expect(loggerMocks.error).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'auth_provider:ory_get_session:error',
          error: failure,
        }),
        expect.stringContaining('Auth.js auth() helper threw')
      )
    })

    it('returns AuthContext on a happy session', async () => {
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
        },
        accessToken: 'access-token',
      })
      expect(loggerMocks.error).not.toHaveBeenCalled()
    })
  })

  describe('signOut', () => {
    it('returns an explicit error because Ory sign-out must go through the route handler', async () => {
      const result = await oryAuthProvider.signOut()
      expect(result).toEqual({
        error: {
          message:
            'Ory sign-out must redirect through /api/auth/oauth/signout-flow',
          code: 'ory_sign_out_requires_route',
        },
      })
    })
  })
})
