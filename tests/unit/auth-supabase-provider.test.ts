import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseServerClient } from '@/core/server/auth/supabase/server-client'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/core/shared/clients/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { SupabaseAuthProvider } = await import(
  '@/core/server/auth/supabase/provider'
)

function buildClient(
  overrides: Partial<{
    getUser: ReturnType<typeof vi.fn>
    getSession: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
  }> = {}
): SupabaseServerClient {
  return {
    auth: {
      getUser: overrides.getUser ?? vi.fn(),
      getSession: overrides.getSession ?? vi.fn(),
      signOut: overrides.signOut ?? vi.fn().mockResolvedValue(undefined),
      // unused in tests but required by type
      exchangeCodeForSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
    } as unknown as SupabaseServerClient['auth'],
  }
}

describe('SupabaseAuthProvider', () => {
  beforeEach(() => {
    loggerMocks.error.mockClear()
    loggerMocks.warn.mockClear()
  })

  describe('getAuthContext', () => {
    it('logs and returns null when getUser returns an error', async () => {
      const userError = { message: 'JWT expired', status: 401 }
      const client = buildClient({
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: userError }),
      })
      const provider = new SupabaseAuthProvider(client)

      const result = await provider.getAuthContext()

      expect(result).toBeNull()
      expect(loggerMocks.error).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'auth_provider:get_user:error',
          error: userError,
        }),
        expect.stringContaining('supabase getUser failed')
      )
    })

    it('returns null without logging when user is simply missing', async () => {
      const client = buildClient({
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      })
      const provider = new SupabaseAuthProvider(client)

      const result = await provider.getAuthContext()

      expect(result).toBeNull()
      expect(loggerMocks.error).not.toHaveBeenCalled()
    })

    it('returns null without logging when no auth session exists', async () => {
      const client = buildClient({
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: {
            name: 'AuthSessionMissingError',
            message: 'Auth session missing!',
            status: 400,
          },
        }),
      })
      const provider = new SupabaseAuthProvider(client)

      const result = await provider.getAuthContext()

      expect(result).toBeNull()
      expect(loggerMocks.error).not.toHaveBeenCalled()
      expect(loggerMocks.warn).not.toHaveBeenCalled()
    })

    it('logs and returns null when getSession returns an error', async () => {
      const sessionError = { message: 'session lookup failed', status: 500 }
      const client = buildClient({
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: sessionError }),
      })
      const provider = new SupabaseAuthProvider(client)

      const result = await provider.getAuthContext()

      expect(result).toBeNull()
      expect(loggerMocks.error).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'auth_provider:get_session:error',
          user_id: 'user-1',
          error: sessionError,
        }),
        expect.stringContaining('supabase getSession failed')
      )
    })

    it('returns auth context on success', async () => {
      const client = buildClient({
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'a@b.dev' } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'token-123' } },
          error: null,
        }),
      })
      const provider = new SupabaseAuthProvider(client)

      const result = await provider.getAuthContext()

      expect(result).toEqual({
        user: expect.objectContaining({ id: 'user-1', email: 'a@b.dev' }),
        accessToken: 'token-123',
      })
      expect(loggerMocks.error).not.toHaveBeenCalled()
    })
  })

  describe('signOut', () => {
    it('logs and returns error as a value when supabase reports one', async () => {
      const signOutError = {
        message: 'session not found',
        code: 'session_not_found',
        status: 404,
      }
      const client = buildClient({
        signOut: vi.fn().mockResolvedValue({ error: signOutError }),
      })
      const provider = new SupabaseAuthProvider(client)

      const result = await provider.signOut({ scope: 'others' })

      expect(result).toEqual({ redirectTo: '/sign-in', error: signOutError })
      expect(loggerMocks.error).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'auth_provider:sign_out:error',
          error: signOutError,
          context: expect.objectContaining({
            scope: 'others',
            error_code: 'session_not_found',
            error_status: 404,
          }),
        }),
        expect.stringContaining('supabase signOut failed')
      )
    })

    it('returns the sign-in redirect with null error on success without logging', async () => {
      const client = buildClient({
        signOut: vi.fn().mockResolvedValue({ error: null }),
      })
      const provider = new SupabaseAuthProvider(client)

      const result = await provider.signOut()

      expect(result).toEqual({ redirectTo: '/sign-in', error: null })
      expect(loggerMocks.error).not.toHaveBeenCalled()
    })

    it('preserves returnTo as a sign-in query param for the reauth flow', async () => {
      const client = buildClient({
        signOut: vi.fn().mockResolvedValue({ error: null }),
      })
      const provider = new SupabaseAuthProvider(client)

      const result = await provider.signOut({
        returnTo: '/dashboard/account',
      })

      expect(result).toEqual({
        redirectTo: '/sign-in?returnTo=%2Fdashboard%2Faccount',
        error: null,
      })
    })
  })
})
